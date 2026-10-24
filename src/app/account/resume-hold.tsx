"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resumeReleasedHold } from "@/app/book/actions";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";

export function ResumeHold({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(resumeReleasedHold, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingText="Opening checkout…">Resume payment</SubmitButton>
        <Link href="/book/schedule" className="btn-secondary">
          Choose a different time
        </Link>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
