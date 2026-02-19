import z from "zod";
import { Gender } from "../../../generated/prisma/enums";

export const createDoctorZodSchema = z.object({
  password: z
    .string("Password is required")
    .min(6, "Password must be at least 6 characters long")
    .max(50, "Password must be at most 50 characters long"),
  doctor: z.object({
    name: z
      .string("Name is required")
      .min(6, "Name must be at least 6 characters long")
      .max(50, "Name must be at most 50 characters long"),
    email: z.email("Invalid email address"),
    contactNumber: z
      .string("Contact number is required")
      .min(11, "Contact number must be 11 characters long")
      .max(14, "Contact number must be 14 characters long"),
    address: z
      .string("Address is required")
      .min(10, "Address must be at least 10 characters long")
      .max(100, "Address must be at most 100 characters long")
      .optional(),
    resgistrationNumber: z.string("Registration number is required"),
    experience: z
      .int("Experience must be a intger number")
      .nonnegative("Experince must be a positive number"),
    gender: z.enum(
      [Gender.MALE, Gender.FEMALE, Gender.OTHER],
      "Gender is required",
    ),
    appointmentFee: z.string("Appointment fee is required"),
    currentWorkingPlace: z.string("Current working place is required"),
    designation: z.string("Designation is required"),
    averageRating: z.number().optional(),
    profilePhoto: z.string().optional(),
  }),
  specicalties: z
    .array(z.uuid(), "Specicalties must be an array of uuids string")
    .min(1, "At least one specicalty is required"),
});
