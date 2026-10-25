"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

const noopSubscribe = () => () => {};

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
  // false in the server HTML and until hydration, then true: no submitting before the form's
  // JavaScript (validation, no-reset handling) is attached.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <button type="submit" disabled={!hydrated || pending || disabled} aria-busy={pending} className={className}>
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
