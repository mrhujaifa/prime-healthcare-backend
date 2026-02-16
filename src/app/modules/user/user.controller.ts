import { Role, Specialty } from "../../../generated/prisma/client";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { IcreateDoctorPayload } from "./user.interface";

const createDoctor = async (payload: IcreateDoctorPayload) => {
  const specialties: Specialty[] = [];

  for (const specialtyId of payload.specialties) {
    const specialty = await prisma.specialty.findUnique({
      where: {
        id: specialtyId,
      },
    });
    if (specialty) {
      specialties.push(specialty);
    } else {
      throw new Error(`Specialty with ID ${specialtyId} not found`);
    }
  }

  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.doctor.email,
    },
  });

  if (userExists) {
    throw new Error("User already exists");
  }

  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.doctor.email,
      password: payload.password,
      role: Role.DOCTOR,
      name: payload.doctor.name,
      needPasswordChange: true,
      deletedAt: null as unknown as Date,
    },
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const doctorData = await tx.doctor.create({
        data: {
          userId: userData.user.id,
          ...payload.doctor,
        },
      });
      const doctorSpecialties = specialties.map((specialty) => ({
        doctorId: doctorData.id,
        specialtyId: specialty.id,
      }));
      await tx.doctorSpecialty.createMany({
        data: doctorSpecialties,
      });
      const doctor = await tx.doctor.findUnique({
        where: {
          id: doctorData.id,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          resgistrationNumber: true,
          experience: true,
          gender: true,
          appointmentFee: true,
          currentWorkingPlace: true,
          designation: true,
          averageRating: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              name: true,
              status: true,
              emailVerified: true,
              createdAt: true,
              updatedAt: true,
              image: true,
              isDeleted: true,
              isVerified: true,
            },
          },
          doctorSpecialties: {
            select: {
              specialty: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      return doctor;
    });
    return result;
  } catch (error) {
    console.log(error);
    await prisma.user.delete({
      where: {
        id: userData.user.id,
      },
    });
  }
};

export const UserService = {
  createDoctor,
};
