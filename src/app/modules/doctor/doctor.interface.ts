import { Gender } from "../../../generated/prisma/enums";

export interface IUpdateDoctorPayload {
  name: string;
  email: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  resgistrationNumber: string;
  experience?: number;
  gender: Gender;
  appointmentFee: string;
  currentWorkingPlace: string;
  designation: string;
  averageRating?: number;
}
