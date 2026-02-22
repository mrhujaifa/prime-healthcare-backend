import { Gender } from "../../../generated/prisma/enums";

export interface IUpdateDoctorSpecialtyPayload {
  shouldDelete?: boolean;
  specialtyId: string;
}

export interface IUpdateDoctorPayload {
  doctor: {
    name: string;
    email: string;
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    registrationNumber?: string;
    experience?: number;
    gender: Gender;
    appointmentFee: number;
    currentWorkingPlace: string;
    designation: string;
    averageRating?: number;
  };

  specialties?: IUpdateDoctorSpecialtyPayload[];
}
