import { uuidv7 } from "zod";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { IBookAppointmentPayload } from "./appointment.interface";
import {
  AppointmentStatus,
  PaymentStatus,
  Role,
} from "../../../generated/prisma/enums";
import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Appointment, Prisma } from "../../../generated/prisma/client";
import {
  appointmentFilterableFields,
  appointmentIncludeConfig,
  appointmentSearchableFields,
} from "./appointment.constant";
import { stripe } from "../../../config/stripe.config";
import { envVars } from "../../../config/env";

const bookAppointment = async (
  payload: IBookAppointmentPayload,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });
  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      id: payload.doctorId,
      isDeleted: false,
    },
  });

  const doctorScheduleData = await prisma.doctorSchedules.findUniqueOrThrow({
    where: {
      doctorId_scheduleId: {
        scheduleId: payload.scheduleId,
        doctorId: doctorData.id,
      },
    },
  });

  const videoCallingId = String(uuidv7());

  const result = await prisma.$transaction(async (tx) => {
    const appointmentData = await tx.appointment.create({
      data: {
        doctorId: payload.doctorId,
        patientId: patientData.id,
        scheduleId: doctorScheduleData.scheduleId,
        videoCallingId,
      },
    });

    await tx.doctorSchedules.update({
      where: {
        doctorId_scheduleId: {
          scheduleId: payload.scheduleId,
          doctorId: payload.doctorId,
        },
      },
      data: {
        isBooked: true,
      },
    });

    // TODO: Add payment integration
    // SOON : Add payment integration

    const transactionId = String(uuidv7());

    const paymentData = await prisma.payment.create({
      data: {
        appointmentId: appointmentData.id,
        amount: doctorData.appointmentFee,
        transactionId,
      },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: `Appointment with ${doctorData.name}`,
            },
            // price: doctorData.appointmentFee * 100,
            unit_amount: doctorData.appointmentFee * 120, // in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointmentData.id,
        paymentId: paymentData.id,
      },

      success_url: `${envVars.FRONTEND_URL}/dashboard/payment/success`,
      cancel_url: `${envVars.FRONTEND_URL}/dashboard/payment/cancel`,
    });
    return {
      appointmentData,
      paymentData,
      paymentUrl: session.url,
    };
  });

  return {
    appointment: result.paymentData,
    payment: result.paymentData,
    paymentUrl: result.paymentUrl,
  };
};
const getMyAppointments = async (user: IRequestUser) => {
  const patientData = await prisma.patient.findUnique({
    where: {
      email: user?.email,
    },
  });

  const doctorData = await prisma.doctor.findUnique({
    where: {
      email: user?.email,
    },
  });

  let appointments;

  if (patientData) {
    appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientData.id,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });
  } else if (doctorData) {
    appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorData.id,
      },
      include: {
        patient: true,
        schedule: true,
      },
    });
  } else {
    throw new Error("User not found");
  }

  return appointments;
};

// 1. Completed Or Cancelled Appointments should not be allowed to update status
// 2. Doctors can only update Appoinment status from schedule to inprogress or inprogress to complted or schedule to cancelled.
// 3. Patients can only cancel the scheduled appointment if it scheduled not completed or cancelled or inprogress.
// 4. Admin and Super admin can update to any status.
const changeAppointmentStatus = async (
  appointmentId: string,
  appointmentStatus: AppointmentStatus,
  user: IRequestUser,
) => {
  // Fetch the appointment, throw if not found
  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
  });

  // Check doctor access
  if (user.role === Role.DOCTOR) {
    if (user.userId !== appointmentData.doctorId) {
      throw new AppError(
        status.FORBIDDEN,
        "Not allowed to update status by doctor",
      );
    }
  }

  // Check patient access
  if (user.role === Role.PATIENT) {
    if (user.userId !== appointmentData.patientId) {
      throw new AppError(status.FORBIDDEN, "Not allowed");
    }
    if (appointmentStatus !== AppointmentStatus.CANCELLED) {
      throw new AppError(
        status.BAD_REQUEST,
        "Patients can only cancel appointments",
      );
    }
  }

  // Reject unknown roles
  if (
    ![Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT].includes(
      user.role,
    )
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "Not allowed to update status by user role ",
    );
  }

  // Prevent updates to finalized appointments
  if (
    appointmentData.status === AppointmentStatus.CANCELLED ||
    appointmentData.status === AppointmentStatus.COMPLETED
  ) {
    throw new AppError(status.BAD_REQUEST, "Appointment already finalized");
  }

  // Prevent updating to the same status
  if (appointmentData.status === appointmentStatus) {
    throw new AppError(
      status.BAD_REQUEST,
      "Already same status selected for update",
    );
  }

  // Update the appointment status
  const result = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: appointmentStatus },
  });

  return result;
};

const getMySingleAppointment = async (
  appointmentId: string,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUnique({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUnique({
    where: {
      email: user.email,
    },
  });

  let appointment;

  if (patientData) {
    appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: patientData.id,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });
  } else if (doctorData) {
    appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctorData.id,
      },
      include: {
        patient: true,
        schedule: true,
      },
    });
  } else {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, "Appointment not found");
  }

  return appointment;
};
const getAllAppointments = async (query: IQueryParams, user: IRequestUser) => {
  const patientExists = await prisma.patient.findUnique({
    where: {
      email: user.email,
    },
  });

  const doctorExists = await prisma.doctor.findUnique({
    where: {
      email: user.email,
    },
  });

  if (!patientExists && !doctorExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  const queryBuilder = new QueryBuilder<
    Appointment,
    Prisma.AppointmentWhereInput,
    Prisma.AppointmentInclude
  >(prisma.appointment, query, {
    filterableFields: appointmentFilterableFields,
    searchableFields: appointmentSearchableFields,
  });
  const result = await queryBuilder
    .search()
    .filter()
    .paginate()
    .dynamicInclude(appointmentIncludeConfig)
    .sort()
    .fields()
    .execute();

  return result;
};

const bookAppointmentWithPayLater = async (
  payload: IBookAppointmentPayload,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      id: payload.doctorId,
      isDeleted: false,
    },
  });

  const scheduleData = await prisma.schedule.findUniqueOrThrow({
    where: {
      id: payload.scheduleId,
    },
  });

  const doctorSchedule = await prisma.doctorSchedules.findUniqueOrThrow({
    where: {
      doctorId_scheduleId: {
        doctorId: doctorData.id,
        scheduleId: scheduleData.id,
      },
    },
  });

  const videoCallingId = String(uuidv7());

  const result = await prisma.$transaction(async (tx) => {
    const appointmentData = await tx.appointment.create({
      data: {
        doctorId: payload.doctorId,
        patientId: patientData.id,
        scheduleId: doctorSchedule.scheduleId,
        videoCallingId,
      },
    });

    await tx.doctorSchedules.update({
      where: {
        doctorId_scheduleId: {
          doctorId: payload.doctorId,
          scheduleId: payload.scheduleId,
        },
      },
      data: {
        isBooked: true,
      },
    });

    const transactionId = String(uuidv7());

    const paymentData = await tx.payment.create({
      data: {
        appointmentId: appointmentData.id,
        amount: doctorData.appointmentFee,
        transactionId,
      },
    });

    return {
      appointment: appointmentData,
      payment: paymentData,
    };
  });

  return result;
};

const initiatePayment = async (appointmentId: string, user: IRequestUser) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
      patientId: patientData.id,
    },
    include: {
      doctor: true,
      payment: true,
    },
  });

  if (!appointmentData) {
    throw new AppError(status.NOT_FOUND, "Appointment not found");
  }

  if (!appointmentData.payment) {
    throw new AppError(
      status.NOT_FOUND,
      "Payment data not found for this appointment",
    );
  }

  if (appointmentData.payment?.status === PaymentStatus.PAID) {
    throw new AppError(
      status.BAD_REQUEST,
      "Payment already completed for this appointment",
    );
  }

  if (appointmentData.status === AppointmentStatus.CANCELLED) {
    throw new AppError(status.BAD_REQUEST, "Appointment is canceled");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `Appointment with Dr. ${appointmentData.doctor.name}`,
          },
          unit_amount: appointmentData.doctor.appointmentFee * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: appointmentData.id,
      paymentId: appointmentData.payment.id,
    },

    success_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-success?appointment_id=${appointmentData.id}&payment_id=${appointmentData.payment.id}`,

    // cancel_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-failed`,
    cancel_url: `${envVars.FRONTEND_URL}/dashboard/appointments?error=payment_cancelled`,
  });

  return {
    paymentUrl: session.url,
  };
};

const canelUnpaidAppointment = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const unpaidAppointments = await prisma.appointment.findMany({
    where: {
      // status: AppointmentStatus.SCHEDULED,
      createdAt: {
        lte: thirtyMinutesAgo,
      },
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  const appointmentToCancel = unpaidAppointments.map(
    (appointment) => appointment.id,
  );

  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: {
        id: {
          in: appointmentToCancel,
        },
      },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    await tx.payment.deleteMany({
      where: {
        appointmentId: {
          in: appointmentToCancel,
        },
      },
    });

    for (const unpaidAppointment of unpaidAppointments) {
      await tx.doctorSchedules.update({
        where: {
          doctorId_scheduleId: {
            doctorId: unpaidAppointment.doctorId,
            scheduleId: unpaidAppointment.scheduleId,
          },
        },
        data: {
          isBooked: false,
        },
      });
    }
  });
};
export const AppointmentService = {
  bookAppointment,
  getMyAppointments,
  changeAppointmentStatus,
  getMySingleAppointment,
  getAllAppointments,
  bookAppointmentWithPayLater,
  initiatePayment,
  canelUnpaidAppointment,
};
