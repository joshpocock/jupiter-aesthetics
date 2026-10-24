"use client";

import Link from "next/link";
import { useActionState } from "react";
import { releaseHold } from "@/app/account/actions";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";

export function ReleaseHold({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(releaseHold, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/account" className="btn-primary btn-lg">
          Finish paying
        </Link>
        <SubmitButton className="btn-secondary btn-lg" pendingText="Releasing…">
          Choose a different time
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
