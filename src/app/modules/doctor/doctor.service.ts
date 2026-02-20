import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateDoctorPayload } from "./doctor.interface";
import { UserStatus } from "../../../generated/prisma/enums";

const getAllDoctor = async () => {
  const allDoctors = await prisma.doctor.findMany();
  return allDoctors;
};

const getDoctorById = async (id: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      user: true,
      specialties: {
        include: {
          specialty: true,
        },
      },
      appointments: {
        include: {
          patient: true,
          schedule: true,
          prescription: true,
        },
      },
      doctorSchedules: {
        include: {
          schedule: true,
        },
      },
      reviews: true,
    },
  });

  return doctor;
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: {
      id,
    },
  });

  if (!isDoctorExist) {
    throw new AppError(status.NOT_FOUND, "Doctor not found");
  }

  const { doctor, specialties } = payload;

  await prisma.$transaction(async (tx) => {
    // Update doctor details if provided
    if (doctor) {
      await tx.doctor.update({
        where: {
          id,
        },
        data: {
          ...doctor,
        },
      });
    }
    // specialties will be added or removed based on the shouldDelete flag in the payload
    if (specialties && specialties.length > 0) {
      for (const specialty of specialties) {
        if (specialty.shouldDelete) {
          await tx.doctorSpecialty.deleteMany({
            where: {
              doctorId: id,
              specialtyId: specialty.specialtyId,
            },
          });
        } else {
          await tx.doctorSpecialty.upsert({
            where: {
              doctorId_specialtyId: {
                doctorId: id,
                specialtyId: specialty.specialtyId,
              },
            },
            update: {},
            create: {
              doctorId: id,
              specialtyId: specialty.specialtyId,
            },
          });
        }
      }
    }
  });

  const doctors = await getDoctorById(id);
  return doctors;
};

const deleteDoctor = async (id: string) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!isDoctorExist) {
    throw new AppError(status.NOT_FOUND, "Doctor not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: isDoctorExist.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED, // Optional: you may also want to block the user
      },
    });

    await tx.session.deleteMany({
      where: { userId: isDoctorExist.userId },
    });

    await tx.doctorSpecialty.deleteMany({
      where: { doctorId: id },
    });
  });

  return { message: "Doctor deleted successfully" };
};

export const DoctorService = {
  getAllDoctor,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
