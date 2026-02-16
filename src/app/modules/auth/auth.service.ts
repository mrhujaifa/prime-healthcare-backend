/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

interface IRegisterPatient {
  name: string;
  email: string;
  password: string;
}

const registerPatient = async (payload: IRegisterPatient) => {
  const { name, email, password } = payload;
  const createUser = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      deletedAt: null as any,
    },
  });

  if (!createUser.user) {
    throw new Error("Failed to Register Patient");
  }

  try {
    const patient = await prisma.$transaction(async (tx) => {
      const patientTx = await tx.patient.create({
        data: {
          userId: createUser.user.id,
          name: payload.name,
          email: payload.email,
        },
      });
      return patientTx;
    });
    return {
      ...createUser,
      patient,
    };
  } catch (error) {
    console.log("Transaction Error", error);
    await prisma.user.delete({
      where: {
        id: createUser.user.id,
      },
    });
    throw error;
  }
};

interface ILoginUserPayload {
  email: string;
  password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;
  const loginUser = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });
  if (loginUser.user.status === UserStatus.BlOCKED) {
    throw new Error("User is Blocked");
  }

  if (loginUser.user.status === UserStatus.SUSPENDED) {
    throw new Error("User is Suspended");
  }

  if (loginUser.user.isDeleted) {
    throw new Error("User is Deleted");
  }

  if (!loginUser.user) {
    throw new Error("Failed to Login User");
  }

  return loginUser.user;
};

export const AuthService = {
  registerPatient,
  loginUser,
};
