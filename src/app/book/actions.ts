"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bookingErrorMessage } from "@/lib/errors";
import { closeCheckout, createDepositCheckout } from "@/lib/payments";
import { invalidateClientPages } from "@/lib/fresh";
import type { FormState } from "@/components/form-alert";
import type { Booking } from "@/lib/types";

export async function bookSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const slot = formData.get("slot");
  if (typeof slot !== "string" || Number.isNaN(Date.parse(slot))) {
    return { error: "Choose a time to continue." };
  }

  const { supabase, user } = await requireUser("/book/schedule");

  // Close any Checkout page this client left open earlier; the database drops those holds.
  const { data: stale } = await supabase
    .from("bookings")
    .select("stripe_checkout_session_id")
    .eq("client_id", user.id)
    .eq("status", "pending_payment");
  const closed = await Promise.all((stale ?? []).map((b) => closeCheckout(b.stripe_checkout_session_id)));
  if (closed.includes("paid")) {
    invalidateClientPages();
    redirect("/account");
  }
  if (closed.includes("unknown")) return { error: "We couldn't reach our payment provider. Please try again." };

  const { data: booking, error } = await supabase
    .rpc("create_pending_booking", { p_slot: new Date(slot).toISOString() })
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
