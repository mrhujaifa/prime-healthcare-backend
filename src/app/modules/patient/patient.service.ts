import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
  IUpdatePatientHealthDataPayload,
  IUpdatePatientProfilePayload,
} from "./patient.interface";
import { convertToDateTime } from "./patient.utils";

const updateMyProfile = async (
  user: IRequestUser,
  payload: IUpdatePatientProfilePayload,
) => {
  // if exitst patient data
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
    include: {
      patientHealthData: true,
      medicalReports: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    // user data update conditon
    const userData = {
      name: payload.patientInfo?.name
        ? payload.patientInfo?.name
        : patientData.name,

      image: payload.patientInfo?.profilePhoto
        ? payload.patientInfo.profilePhoto
        : patientData.profilePhoto,
    };

    // This condition for change patientInformation after update patient user profile
    if (payload.patientInfo) {
      await tx.patient.update({
        where: {
          id: patientData?.id,
        },
        data: {
          ...payload.patientInfo,
        },
      });

      if (payload.patientInfo.name || payload.patientInfo.profilePhoto) {
        await tx.user.update({
          where: {
            id: patientData?.userId,
          },

          data: {
            ...userData,
          },
        });
      }
    }

    // This condition for change PatientHealthData after update patient user profile
    if (payload.patientHealthData) {
      const healthDataToSave: IUpdatePatientHealthDataPayload = {
        ...payload.patientHealthData,
      };

      // check dateOfBirth date validation then update date of birth
      if (payload.patientHealthData.dateOfBirth) {
        healthDataToSave.dateOfBirth = convertToDateTime(
          typeof healthDataToSave.dateOfBirth === "string"
            ? healthDataToSave.dateOfBirth
            : undefined,
        ) as Date;
      }

      await tx.patientHealthData.upsert({
        where: {
          id: patientData.id,
        },
        update: healthDataToSave,
        create: {
          patientId: patientData.id,
          ...healthDataToSave,
        },
      });
    }

    // This condition for change PatientMedicalReportData after update patient user profile

    if (
      payload.medicalReports &&
      Array.isArray(payload.patientHealthData) &&
      payload.medicalReports.length > 0
    ) {
      for (const report of payload.medicalReports) {
        if (report.shouldDelete && report.reportId) {
          const deletedReport = await tx.medicalReport.delete({
            where: {
              id: report.reportId,
            },
          });

          if (deletedReport.reportLink) {
            await deleteFileFromCloudinary(deletedReport.reportLink);
          }
        } else if (report.reportName && report.reportLink) {
          await tx.medicalReport.create({
            data: {
              patientId: patientData.id,
              reportName: report.reportName,
              reportLink: report.reportLink,
            },
          });
        }
      }
    }
  });

  const result = await prisma.patient.findUnique({
    where: {
      id: patientData.id,
    },
    include: {
      user: true,
      patientHealthData: true,
      medicalReports: true,
    },
  });

  return result;
};

export const PatientServices = {
  updateMyProfile,
};
