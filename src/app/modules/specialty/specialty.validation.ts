import z from "zod";

export const specialtyValidationZodSchema = z.object({
  title: z.string("Title is required"),
  discription: z.string().optional(),
});
