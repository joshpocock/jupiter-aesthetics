"use client";

import { useFormStatus } from "react-dom";

export function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden
    />
  );
}

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  disabled,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
  /** From useActionState, for forms submitted through ActionForm. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? "One moment…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
