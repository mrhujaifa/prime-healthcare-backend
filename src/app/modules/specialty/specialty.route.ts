import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPERADMIN),
  SpecialtyController.createSpecialty,
);
router.get("/", SpecialtyController.getAllSpecialties);
router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPERADMIN),
  SpecialtyController.deleteSpecialty,
);

export const SpecialtyRoutes = router;
