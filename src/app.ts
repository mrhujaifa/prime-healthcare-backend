import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { glowbalErrorHandler } from "./app/middlewares/glowbalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import cors from "cors";
import { envVars } from "./config/env";
import { PaymentController } from "./app/modules/payment/payment.controller";
import cron from "node-cron";
import { AppointmentService } from "./app/modules/appointment/appointment.service";

const app: Application = express();

// Enable CORS middleware
app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Stripe webhook endpoint
app.use(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
  PaymentController.handleStripeWebhookEvent,
);

// View engine
app.set("view engine", "ejs");

// Set views directory
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

app.use("/api/auth", toNodeHandler(auth));

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to Cookie parser
app.use(cookieParser());

// All router

app.use("/api/v1", IndexRoutes);

// cron
cron.schedule("*/25 * * * *", async () => {
  try {
    await AppointmentService.canelUnpaidAppointment();
  } catch (error) {
    console.log("Error from cron schedule =>>>>>>>", error);
  }
});

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript + Express!");
});

app.use(glowbalErrorHandler);
app.use(notFound);

export default app;
