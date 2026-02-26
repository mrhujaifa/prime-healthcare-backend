/* eslint-disable @typescript-eslint/no-explicit-any */
import { envVars } from "../../config/env";
import { Role } from "../../generated/prisma/enums";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isSuperAdminExist) {
      console.log("Super admin already exists.  skiping seeding super admin");
      return;
    }

    const superAdminUser = await auth.api.signUpEmail({
      body: {
        email: envVars.SUPER_ADMIN_EMAIL,
        name: envVars.SUPER_ADMIN_NAME,
        password: envVars.SUPER_ADMIN_PASSWORD,
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
        rememberMe: false,
        deletedAt: null as any,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminUser.user.id,
        },
        data: {
          emailVerified: true,
        },
      });

      await tx.admin.create({
        data: {
          userId: superAdminUser.user.id,
          name: envVars.SUPER_ADMIN_NAME,
          email: envVars.SUPER_ADMIN_EMAIL,
        },
      });
    });

    const superAdmin = await prisma.admin.findFirst({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
      include: {
        user: true,
      },
    });

    console.log(" super admin Created successfull", superAdmin);
  } catch (error) {
    console.log(error);
    await prisma.user.delete({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
    });
  }
};
