import { Gender } from "../../../generated/prisma/enums";

export interface IcreateDoctorPayload {
  password: string;
  doctor: {
    name: string;
    email: string;
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    registrationNumber: string;
    experience?: number;
    gender: Gender;
    appointmentFee: string;
    currentWorkingPlace: string;
    designation: string;
    averageRating?: number;
  };

  specialties: string[];
}
