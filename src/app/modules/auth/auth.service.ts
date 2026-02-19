/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";

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
    throw new AppError(status.BAD_REQUEST, "Failed to Register Patient");
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

    const accessToken = tokenUtils.getAccessToken({
      userId: createUser.user.id,
      email: createUser.user.email,
      role: createUser.user.role,
      status: createUser.user.status,
      isDeleted: createUser.user.isDeleted,
    });
    const refreshToken = tokenUtils.getRefreshToken({
      userId: createUser.user.id,
      email: createUser.user.email,
      role: createUser.user.role,
      status: createUser.user.status,
      isDeleted: createUser.user.isDeleted,
    });

    return {
      accessToken,
      refreshToken,
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
    throw new AppError(status.FORBIDDEN, "User is Blocked");
  }

  if (loginUser.user.status === UserStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "User is Suspended");
  }

  if (loginUser.user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User is Deleted");
  }

  if (!loginUser.user) {
    throw new AppError(status.UNAUTHORIZED, "Failed to Login User");
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: loginUser.user.id,
    email: loginUser.user.email,
    role: loginUser.user.role,
    status: loginUser.user.status,
    isDeleted: loginUser.user.isDeleted,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: loginUser.user.id,
    email: loginUser.user.email,
    role: loginUser.user.role,
    status: loginUser.user.status,
    isDeleted: loginUser.user.isDeleted,
  });

  return {
    ...loginUser,
    accessToken,
    refreshToken,
  };
};

export const AuthService = {
  registerPatient,
  loginUser,
};
