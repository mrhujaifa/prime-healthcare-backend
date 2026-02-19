import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        default: true,
        defaultValue: Role.PATIENT,
      },
      status: {
        type: "string",
        default: true,
        defaultValue: UserStatus.ACTIVE,
      },
      needPasswordChange: {
        type: "boolean",
        default: true,
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        default: true,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        default: true,
        defaultValue: null,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 60 * 24, // 1 day in sec
    updateAge: 60 * 60 * 60 * 24, // 1 day in sec
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 60 * 24, // 1 day in sec
    },
  },
});
