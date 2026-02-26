import { Prisma } from "../../../generated/prisma/client";

export const appointmentFilterableFields = [
  "id",
  "status",
  "doctorId",
  "patientId",
];
export const appointmentSearchableFields = [
  "id",
  "status",
  "doctorId",
  "patientId",
];

export const appointmentIncludeConfig: Partial<
  Record<
    keyof Prisma.AppointmentInclude,
    Prisma.AppointmentInclude[keyof Prisma.AppointmentInclude]
  >
> = {
  doctor: true,
  patient: true,
  schedule: true,
  payment: true,
  prescription: true,
  review: true,
};
