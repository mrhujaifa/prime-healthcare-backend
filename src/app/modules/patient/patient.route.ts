import { Router } from "express";
import { PatientController } from "./patient.controller";
import validateRequest from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { PatientValidation } from "./patient.validation";
import { updateMyPatientProfileMiddleware } from "./patient.middlewares";
import { multerUpload } from "../../../config/multer.config";

const router = Router();

router.patch(
  "/update-my-profile",
  checkAuth(Role.SUPER_ADMIN, Role.PATIENT),
  multerUpload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "medicalReports", maxCount: 5 },
  ]),
  updateMyPatientProfileMiddleware,
  validateRequest(PatientValidation.updatePatientProfileZodSchema),
  PatientController.updateMyProfile,
);

export const PatientRouters = router;
