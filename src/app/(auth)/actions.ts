"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import { invalidateClientPages } from "@/lib/fresh";
import type { FormState } from "@/components/form-alert";

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Please confirm your email first. Check your inbox for the link."
          : "That email and password don't match.",
    };
  }
  invalidateClientPages();
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials
    .extend({ full_name: z.string().trim().min(2, "Enter your full name.").max(120) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const next = safeNext(formData.get("next"), "/book");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "An account with that email already exists. Log in instead."
          : error.message,
    };
  }
  if (!data.session) {
    return { message: "Check your email for a link to confirm your account, then continue booking." };
  }
  invalidateClientPages();
  redirect(next);
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.email("Enter a valid email address.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/account/password`,
  });
  // Same answer either way, so the form can't be used to discover who has an account.
  if (error && error.status === 429) {
    return { error: "Too many requests. Please wait a few minutes and try again." };
  }
  return { message: "If there's an account for that email, a reset link is on its way. Check your inbox." };
}

const newPassword = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPassword.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password you haven't used before."
          : "We couldn't update your password. Please try again.",
    };
  }
  // Sign out any other device that might be using the old password.
  await supabase.auth.signOut({ scope: "others" });
  invalidateClientPages();
  redirect("/account?changed=password");
}

export async function signOut() {
  const supabase = await createClient();
  // "local" ends only this browser's session. Supabase's default ("global") would also sign the
  // client out on their phone, laptop and every other device mid-booking.
  await supabase.auth.signOut({ scope: "local" });
  invalidateClientPages();
  redirect("/login?signed_out=1");
}
