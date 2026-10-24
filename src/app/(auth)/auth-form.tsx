"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "./actions";
import { ActionForm } from "@/components/action-form";
import { FormAlert } from "@/components/form-alert";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? signIn : signUp, undefined);
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <ActionForm action={action} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && (
        <div>
          <label htmlFor="full_name" className="label">Full name</label>
          <input id="full_name" name="full_name" autoComplete="name" required className="input" />
        </div>
      )}
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
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="password" className="label">Password</label>
          {mode === "login" && (
            <Link href="/forgot-password" className="link mb-1 inline-flex min-h-11 items-center text-sm">
              Forgot password?
            </Link>
          )}
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "signup" && <p className="hint">At least 8 characters.</p>}
      </div>
      <FormAlert state={state} />
      <SubmitButton
        className="btn-primary btn-lg w-full"
        pending={pending}
        pendingText={mode === "login" ? "Signing in…" : "Creating your account…"}
      >
        {mode === "login" ? "Sign in" : "Create account"}
      </SubmitButton>
      <p className="text-center text-[0.9375rem] text-muted">
        {mode === "login" ? (
          <>
            New to Jupiter? <Link href={`/signup${query}`} className="link inline-flex min-h-11 items-center">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href={`/login${query}`} className="link inline-flex min-h-11 items-center">Sign in</Link>
          </>
        )}
      </p>
    </ActionForm>
  );
}
