"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bookingErrorMessage } from "@/lib/errors";
import { closeCheckout } from "@/lib/payments";
import { stripe } from "@/lib/stripe";
import type { FormState } from "@/components/form-alert";
import type { Booking } from "@/lib/types";

// Filters on client_id too: RLS alone would let an owner act on other clients' bookings.
async function ownBooking(id: FormDataEntryValue | null) {
  const { supabase, user } = await requireUser("/account");
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", typeof id === "string" ? id : "")
    .eq("client_id", user.id)
    .maybeSingle<Booking>();
  return { supabase, booking };
}

export async function rescheduleBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const slot = formData.get("slot");
  if (typeof slot !== "string" || Number.isNaN(Date.parse(slot))) {
    return { error: "Choose a new time to continue." };
  }
  const { supabase, booking } = await ownBooking(formData.get("booking_id"));
  if (!booking) return { error: bookingErrorMessage({ message: "not_found" }) };

  const { error } = await supabase.rpc("reschedule_booking", {
    p_booking: booking.id,
    p_slot: new Date(slot).toISOString(),
  });
  if (error) {
    if (error.message === "slot_taken") refresh(); // show the calendar as it is now
    return { error: bookingErrorMessage(error) };
  }

  revalidatePath("/account");
  redirect("/account?changed=rescheduled");
}

export async function cancelBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, booking } = await ownBooking(formData.get("booking_id"));
  if (!booking) return { error: bookingErrorMessage({ message: "not_found" }) };

  // Close Checkout first, so a payment can't land on a hold we've just cancelled.
  if (booking.status === "pending_payment") {
    const result = await closeCheckout(booking.stripe_checkout_session_id);
    if (result === "paid") {
      revalidatePath("/account");
      return { message: "Your deposit had already gone through, so this booking is confirmed." };
    }
    if (result === "unknown") return { error: "We couldn't reach our payment provider. Please try again." };
  }

  const { error } = await supabase.rpc("cancel_booking", { p_booking: booking.id });
  if (error) return { error: bookingErrorMessage(error) };

  revalidatePath("/account");
  redirect("/account?changed=cancelled");
}

/** Backing out of Stripe Checkout lands on /book/cancelled, which offers this to free the slot. */
export async function releaseHold(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, booking } = await ownBooking(formData.get("booking_id"));
  if (booking?.status === "pending_payment") {
    const result = await closeCheckout(booking.stripe_checkout_session_id);
    if (result === "paid") redirect("/account");
    if (result === "unknown") return { error: "We couldn't reach our payment provider. Please try again." };
    await supabase.rpc("cancel_booking", { p_booking: booking.id });
  }
  redirect("/book/schedule");
}

/** Sends a client back to the Checkout page for a hold they haven't paid yet. */
export async function resumePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { booking } = await ownBooking(formData.get("booking_id"));
  if (booking?.status !== "pending_payment" || !booking.stripe_checkout_session_id) {
    return { error: "This hold has expired. Please choose a time again." };
  }

  const session = await stripe().checkout.sessions.retrieve(booking.stripe_checkout_session_id);
  if (session.status !== "open" || !session.url) {
    return { error: "This hold has expired. Please choose a time again." };
  }
  redirect(session.url);
}
