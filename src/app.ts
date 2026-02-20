import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { glowbalErrorHandler } from "./app/middlewares/glowbalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import cookieParser from "cookie-parser";

const app: Application = express();

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to Cookie parser
app.use(cookieParser());

// All router

app.use("/api/v1", IndexRoutes);

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript + Express!");
});

app.use(glowbalErrorHandler);
app.use(notFound);

export default app;
