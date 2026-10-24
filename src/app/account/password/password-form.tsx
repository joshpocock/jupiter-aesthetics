"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(auth)/actions";
import { ActionForm } from "@/components/action-form";
import { FormAlert } from "@/components/form-alert";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <ActionForm action={action} className="space-y-6">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm new password</label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary btn-lg w-full" pending={pending} pendingText="Saving…">
        Save password
      </SubmitButton>
    </ActionForm>
  );
}
