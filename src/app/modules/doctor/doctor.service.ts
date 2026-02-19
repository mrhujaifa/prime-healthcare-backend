import { prisma } from "../../lib/prisma";

const getAllDoctor = async () => {
  const allDoctors = await prisma.doctor.findMany();
  return allDoctors;
};

export const DoctorService = {
  getAllDoctor,
};
