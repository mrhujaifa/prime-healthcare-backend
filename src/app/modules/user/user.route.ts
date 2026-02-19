import { Router } from "express";
import { UserController } from "./user.service";

import validateRequest from "../../middlewares/validateRequest";
import { createDoctorZodSchema } from "./user.validation";

const router = Router();

router.post(
  "/create-doctor",
  validateRequest(createDoctorZodSchema),
  UserController.createDoctor,
);

export const UserRoutes = router;
