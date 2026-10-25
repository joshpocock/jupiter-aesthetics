"use client";

import { useTransition } from "react";

/**
 * A form that runs a server action without React's automatic reset, so whatever someone
 * typed stays put when the action comes back with an error (e.g. a long intake form).
 * Pass `pending` from useActionState to SubmitButton, since useFormStatus doesn't see it.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (formData: FormData) => void;
}) {
  const [, startTransition] = useTransition();
  return (
    <form
      {...props}
      // Never GET: if this form were ever submitted natively (before the page's JavaScript runs),
      // a GET would put every field, passwords included, in the URL. SubmitButton also stays
      // disabled until hydration, so that can't normally happen.
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(e.currentTarget, submitter);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}
