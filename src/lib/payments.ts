import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEPOSIT_CENTS, formatSlot } from "@/lib/schedule";
import { siteUrl } from "@/lib/site";
import type { Booking } from "@/lib/types";

const CHECKOUT_MINUTES = 31; // Stripe's minimum is 30; the database holds the slot for 35.

export async function createDepositCheckout(booking: Booking, email: string | undefined) {
  const site = await siteUrl();
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      allowed_payment_method_types: ["card"], // immediate confirmation, no delayed methods
      customer_email: email,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id },
      payment_intent_data: {
        metadata: { booking_id: booking.id },
        description: `Consultation deposit · ${formatSlot(booking.slot_start)}`,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: DEPOSIT_CENTS,
            product_data: {
              name: "Consultation deposit",
              description: `Free consultation on ${formatSlot(booking.slot_start)}`,
            },
          },
        },
      ],
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${site}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/book/cancelled?booking=${booking.id}`,
    },
    { idempotencyKey: `deposit-checkout-${booking.id}` },
  );

  const { error } = await createAdminClient().rpc("attach_checkout_session", {
    p_booking: booking.id,
    p_session: session.id,
  });
  if (error) throw error;

  return session;
}

/** Records a paid Checkout session against its booking. Safe to call more than once. */
export async function confirmFromSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId || session.payment_status !== "paid") return null;

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const { data, error } = await createAdminClient()
    .rpc("confirm_booking_payment", {
      p_booking: bookingId,
      p_session: session.id,
      p_payment_intent: paymentIntent ?? null,
    })
    .single<Booking>();
  if (error) throw error;
  return data;
}

/**
 * Closes an unpaid Checkout page so an abandoned hold can't be paid later.
 * Returns "paid" if the client already paid (the booking is confirmed instead), and
 * "unknown" if Stripe couldn't be reached, in which case the hold should be left alone.
 */
export async function closeCheckout(sessionId: string | null): Promise<"closed" | "paid" | "unknown"> {
  if (!sessionId) return "closed";
  try {
    let session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.status === "open") session = await stripe().checkout.sessions.expire(sessionId);
    if (session.payment_status === "paid") {
      await confirmFromSession(session);
      return "paid";
    }
    return "closed";
  } catch (err) {
    console.error("Could not close Checkout session", sessionId, err);
    return "unknown";
  }
}
