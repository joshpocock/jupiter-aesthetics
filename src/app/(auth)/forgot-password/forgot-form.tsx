"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { ActionForm } from "@/components/action-form";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <ActionForm action={action} className="space-y-6">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="input"
        />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary btn-lg w-full" pending={pending} pendingText="Sending…">
        Send reset link
      </SubmitButton>
      <p className="text-center text-[0.9375rem] text-muted">
        Remembered it? <Link href="/login" className="link inline-flex min-h-11 items-center">Sign in</Link>
      </p>
    </ActionForm>
  );
}
