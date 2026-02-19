/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { envVars } from "../../config/env";
import status from "http-status";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import { ZodIssue } from "zod/v3";
import z from "zod";
import { handleZodError } from "../errorHelper/handleZodError";
import AppError from "../errorHelper/AppError";

export const glowbalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log full error object in development mode to help debugging
  if (envVars.NODE_ENV === "development") {
    console.log("Error from Glowbal Error Handler", error);
  }

  // Default values for error response
  // Will be overwritten if we identify the type of error

  let errorSources: TErrorSources[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";
  let stack: string | undefined = undefined;

  if (error instanceof z.ZodError) {
    // If the error is a Zod validation error (schema validation failure)
    // Use handleZodError helper to format the error nicely

    const zodError = handleZodError(error);
    statusCode = zodError.statusCode as number;
    message = zodError.message;
    errorSources = [...zodError.errorSources];
  } else if (error instanceof AppError) {
    // If the error is a custom application error
    // AppError allows us to define our own status codes and messages

    statusCode = error.statusCode;
    message = error.message;
    errorSources = [
      {
        path: "",
        message: error.message,
      },
    ];
    stack = error.stack;
  } else if (error instanceof Error) {
    // For all other generic JavaScript errors
    // This ensures even unexpected errors are returned in a consistent format
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = error?.message;
    errorSources = [
      {
        path: "",
        message: error.message,
      },
    ];
    stack = error.stack;
  }

  // Construct the structured error response
  const errorResponse: TErrorResponse = {
    success: false,
    message: message,
    errorSources,
    error: envVars.NODE_ENV === "development" ? error : undefined,
  };

  // Send JSON response to the client with appropriate HTTP status code
  res.status(statusCode).json(errorResponse);
};
