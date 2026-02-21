import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "../utils/email";
import { envVars } from "../../config/env";

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Configure authentication methods
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Configure social providers
  socialProviders: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      // callbackUrl: envVars.GOOGLE_CALLBACK_URL,
      mapProfileToUser: () => {
        return {
          emailVerified: true,
          role: Role.PATIENT,
          neeedPasswordChange: false,
          isDeleted: false,
          deletedAt: null,
          status: UserStatus.ACTIVE,
        };
      },
    },
  },

  redirects: {
    signIn: `${envVars.FRONTEND_URL}/api/v1/auth/google/success`,
  },
  //  Configure email verification settings
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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

  // Configure authentication plugins
  plugins: [
    // Configure bearer token plugin for API authentication
    bearer(),
    // Configure email OTP plugin for email verification and passwordless login
    emailOTP({
      overrideDefaultEmailVerification: true,
      // Customize the function to send OTP emails
      async sendVerificationOTP({ email, otp, type }) {
        // You can customize the email content and sending logic here
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          // Send OTP email to the user
          if (user && !user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify your email",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findFirst({
            where: {
              email,
            },
          });
          if (user) {
            sendEmail({
              to: email,
              subject: "Reset your password",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        }
      },

      expiresIn: 2 * 60, // 2 minutes in seconds
      otpLength: 8,
    }),
  ],
  // Configure advanced settings
  advanced: {
    useSecureCookies: false,
    // You can add more advanced settings here as needed
    cookies: {
      // Customize cookie settings for access token, refresh token, and session token
      state: {
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
        },
      },
      // You can also customize the session token cookie settings if needed
      sessionToken: {
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
        },
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
