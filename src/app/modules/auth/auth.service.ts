/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { jwtUtils } from "../../utils/jwt";
import { envVars } from "../../../config/env";
import { JwtPayload } from "jsonwebtoken";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterPatient,
} from "./auth.interface";

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

const getMe = async (user: IRequestUser) => {
  const me = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      patient: true,

      doctor: true,
      admin: true,
      sessions: true,
    },
  });
  if (!me) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  return me;
};

const getNewTOken = async (refreshToken: string, sesssionToken: string) => {
  const isSessionTokenExists = await prisma.session.findUnique({
    where: {
      token: sesssionToken,
    },
    include: {
      user: true,
    },
  });

  if (!isSessionTokenExists) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! Invalid session token.",
    );
  }
  const verifiedToken = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );

  if (!verifiedToken.success && verifiedToken.error) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! Invalid refresh token.",
    );
  }

  const data = verifiedToken.data as JwtPayload;
  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
  });
  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
  });

  const { token } = await prisma.session.update({
    where: {
      token: sesssionToken,
    },
    data: {
      expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000), // 24 hours from now
      updatedAt: new Date(),
    },
  });
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    session: token,
  };
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  console.log(sessionToken);

  // verify session token
  const sesssion = await auth.api.getSession({
    headers: new Headers({
      authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!sesssion?.session) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! Invalid session token.",
    );
  }

  // if session is valid then change password
  const { currentPassword, newPassword } = payload;

  // call better auth change password api
  const result = await auth.api.changePassword({
    body: {
      currentPassword: currentPassword,
      newPassword: newPassword,
      revokeOtherSessions: true, // if password is change then logout form all devices
    },
    headers: {
      Authorization: `Bearer ${sessionToken}`, // pass session token in header to verify user session
    },
  });

  if (sesssion.user.needPasswordChange) {
    await prisma.user.update({
      where: {
        id: sesssion.user.id,
      },
      data: {
        needPasswordChange: false,
      },
    });
  }
  return result;
};

const logoutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      authorization: `Bearer ${sessionToken}`,
    }),
  });
  return result;
};

const verifyEmail = async (email: string, otp: string) => {
  // call better auth verify email api
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  // if email is verified then update emailVerified field in user table
  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
};

const forgetPassword = async (email: string) => {
  // check user is exists or not
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found with this email");
  }

  if (!isUserExists.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "User is not verified");
  }

  if (isUserExists.isDeleted || isUserExists.status === UserStatus.DELETED) {
    throw new AppError(status.BAD_REQUEST, "User is deleted");
  }

  // call better auth forget password api to send otp to user email
  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  // check user is exists or not
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found with this email");
  }

  if (!isUserExists.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "User is not verified");
  }

  if (isUserExists.isDeleted || isUserExists.status === UserStatus.DELETED) {
    throw new AppError(status.BAD_REQUEST, "User is deleted");
  }

  // call better auth reset password api
  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  // after password reset logout from all devices by deleting all sessions of user
  await prisma.session.deleteMany({
    where: {
      userId: isUserExists.id,
    },
  });
};

const googleLoginSuccess = async (session: Record<string, any>) => {
  const isPatientExists = await prisma.patient.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (!isPatientExists) {
    await prisma.patient.create({
      data: {
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
  });

  return {
    accessToken,
    refreshToken,
  };
};
export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  getNewTOken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess,
};
