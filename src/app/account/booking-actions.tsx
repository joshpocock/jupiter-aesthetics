"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cancelBooking, resumePayment } from "./actions";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";
import { ContactUs } from "@/components/contact";
import type { BookingStatus } from "@/lib/types";

export function BookingActions({
  id,
  status,
  changeable,
}: {
  id: string;
  status: BookingStatus;
  changeable: boolean;
}) {
  const [cancelState, cancelAction] = useActionState(cancelBooking, undefined);
  const [payState, payAction] = useActionState(resumePayment, undefined);
  const [confirming, setConfirming] = useState(false);

  const calendar = status === "confirmed" && (
    <a href={`/account/bookings/${id}/calendar`} className="btn-secondary">
      Add to calendar
    </a>
  );

  if (status === "confirmed" && !changeable) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">{calendar}</div>
        <p className="text-[0.9375rem] text-muted">
          It&apos;s less than 24 hours away, so changes can&apos;t be made online. Please <ContactUs />.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <form action={cancelAction} className="space-y-4 rounded-2xl bg-rose/5 p-5">
        <input type="hidden" name="booking_id" value={id} />
        <p className="text-[0.9375rem] leading-relaxed">
          {status === "confirmed"
            ? "Cancel this consultation? Your $50 deposit isn't refunded automatically."
            : "Release this time? No payment has been taken."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton className="btn-danger" pendingText="Cancelling…">
            Yes, cancel
          </SubmitButton>
          <button type="button" autoFocus onClick={() => setConfirming(false)} className="btn-secondary">
            Keep my booking
          </button>
        </div>
        <FormAlert state={cancelState} />
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {status === "pending_payment" && (
          <form action={payAction} className="contents">
            <input type="hidden" name="booking_id" value={id} />
            <SubmitButton pendingText="Opening checkout…">Pay $50 deposit</SubmitButton>
          </form>
        )}
        {status === "confirmed" && (
          <Link href={`/account/bookings/${id}/reschedule`} className="btn-primary">
            Reschedule
          </Link>
        )}
        {calendar}
        <button type="button" onClick={() => setConfirming(true)} className="btn-ghost text-rose hover:bg-rose/8 hover:text-rose">
          {status === "pending_payment" ? "Release this time" : "Cancel booking"}
        </button>
      </div>
      <FormAlert state={cancelState ?? payState} />
    </div>
  );
}
