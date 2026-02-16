/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { envVars } from "../../config/env";
import status from "http-status";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const glowbalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (envVars.NODE_ENV === "development") {
    console.log("Error from Glowbal Error Handler", error);
  }

  const statusCode: number = status.INTERNAL_SERVER_ERROR;
  const message: string = "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
    error: error.message,
  });
};
