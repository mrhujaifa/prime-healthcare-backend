/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from "express";
import { envVars } from "../../../config/env";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { stripe } from "../../../config/stripe.config";
import { PaymentService } from "./payment.service";
import { send } from "node:process";
import AppError from "../../errorHelper/AppError";

const handleStripeWebhookEvent = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET as string;

  if (!signature || !webhookSecret) {
    sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Missing signature or webhookSecret",
    });
    return;
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Error processing the webhook event",
    });
  }

  try {
    const result = await PaymentService.handleStripeWebhookEvent(event as any);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Webhook event processed successfully",
      data: result,
    });
  } catch (error) {
    sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Error processing the webhook event",
    });
    throw new AppError(
      status.BAD_REQUEST,
      "Error processing the webhook event",
    );
  }
};

export const PaymentController = { handleStripeWebhookEvent };
