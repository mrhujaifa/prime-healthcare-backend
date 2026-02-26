import { Router } from "express";
import { SpecialtyRoutes } from "../modules/specialty/specialty.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { DoctorRoutes } from "../modules/doctor/doctor.route";
import { scheduleRoutes } from "../modules/schedule/schedule.route";
import { AppointmentRoutes } from "../modules/appointment/appointment.route";
import { DoctorScheduleRoutes } from "../modules/doctorSchedule/doctorSchedule.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/specialties", SpecialtyRoutes);
router.use("/users", UserRoutes);
router.use("/doctors", DoctorRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/", DoctorScheduleRoutes);
router.use("/appointment", AppointmentRoutes);

export const IndexRoutes = router;
