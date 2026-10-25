"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bookingErrorMessage } from "@/lib/errors";
import { createDepositCheckout } from "@/lib/payments";
import { invalidateClientPages } from "@/lib/fresh";
import { isResumable } from "@/lib/booking-state";
import type { FormState } from "@/components/form-alert";
import type { Booking } from "@/lib/types";

/**
 * Holds a slot and sends the client to a fresh Stripe Checkout for the deposit. Both new
 * bookings and "Resume payment" on a released hold go through here, so the no-double-booking
 * rules in create_pending_booking always apply.
 */
async function holdAndCheckout(slotIso: string, from: string): Promise<FormState> {
  const { supabase, user } = await requireUser(from);

  // Other unpaid holds are left alone: each keeps its own 35 minutes and its own Checkout.
  const { data: booking, error } = await supabase
    .rpc("create_pending_booking", { p_slot: slotIso })
    .single<Booking>();
  if (error || !booking) {
    if (error?.message === "slot_taken") refresh(); // show the calendar as it is now
    return { error: bookingErrorMessage(error) };
  }

  let url: string | null;
  try {
    url = (await createDepositCheckout(booking, user.email)).url;
  } catch (err) {
    console.error("Checkout creation failed", err);
    await supabase.rpc("cancel_booking", { p_booking: booking.id });
    return { error: "We couldn't start the payment. Please try again." };
  }
  if (!url) return { error: "We couldn't start the payment. Please try again." };

  invalidateClientPages(); // My bookings must show the new hold when they come back
  redirect(url);
}

export async function bookSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const slot = formData.get("slot");
  if (typeof slot !== "string" || Number.isNaN(Date.parse(slot))) {
    return { error: "Choose a time to continue." };
  }
  return holdAndCheckout(new Date(slot).toISOString(), "/book/schedule");
}

/**
 * "Resume payment" for an unpaid hold that was released (it ran out, or the client started
 * another booking). The released time may have gone to someone else, so this re-takes the
 * same time through the normal booking path rather than reviving the old row.
 */
export async function resumeReleasedHold(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("booking_id");
  const { supabase, user } = await requireUser("/account");
  const { data: old } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", typeof id === "string" ? id : "")
    .eq("client_id", user.id)
    .maybeSingle<Booking>();

  if (!old || !isResumable(old)) {
    return { error: "That hold can't be resumed. Please choose a time." };
  }
  const result = await holdAndCheckout(new Date(old.slot_start).toISOString(), "/account");
  if (result?.error === bookingErrorMessage({ message: "slot_taken" }) ||
      result?.error === bookingErrorMessage({ message: "slot_unavailable" })) {
    return { error: "That time is no longer available. Please choose another time." };
  }
  return result;
}
