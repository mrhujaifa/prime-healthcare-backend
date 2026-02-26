/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { PaymentStatus } from "../../../generated/prisma/enums";

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
  const paymentExist = await prisma.payment.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });

  if (paymentExist) {
    console.log(`Event `);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;
      const paymentId = session.metadata?.paymentId;
      if (!appointmentId || !paymentId) {
        return {
          message: "Missing appointment or paymentId in session metadata",
        };
      }
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: appointmentId,
        },
      });

      if (!appointment) {
        return {
          message: "Appointment not found",
        };
      }

      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: {
            // update the payment status of the appointment
            id: appointmentId,
          },
          data: {
            // update the payment status of the appointment
            paymentStatus:
              session.payment_status === "paid"
                ? PaymentStatus.PAID
                : PaymentStatus.UNPAID,
          },
        });

        await tx.payment.update({
          where: {
            id: paymentId,
          },
          data: {
            stripeEventId: event.id,
            status:
              session.payment_status === "paid"
                ? PaymentStatus.PAID
                : PaymentStatus.UNPAID,
            paymentGatewayData: session as any,
          },
        });
      });

      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;

      if (session) {
        console.log(`Checkout session ${session.id} expired.`);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const session = event.data.object;

      if (session) {
        console.log(`Payment failed for checkout session ${session.id}.`);
      }
      break;
    }
    default:
      console.log(`unhandled event type: ${event.type}`);
  }

  return {
    message: "Event processed successfully",
  };
};

export const PaymentService = {
  handleStripeWebhookEvent,
};
