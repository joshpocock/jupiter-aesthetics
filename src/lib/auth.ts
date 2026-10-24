import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in user and their profile, or a redirect to log in. */
export async function requireUser(next = "/account") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);

  return { supabase, user, profile };
}

export async function requireOwner() {
  const ctx = await requireUser("/owner");
  if (ctx.profile.role !== "owner") redirect("/account");
  return ctx;
}

/** Only allow same-site relative redirects (rejects //host, /\host and control characters). */
export function safeNext(next: unknown, fallback = "/account") {
  if (typeof next !== "string" || !next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }
  const base = "http://same-site.invalid";
  const url = new URL(next, base);
  return url.origin === base ? url.pathname + url.search + url.hash : fallback;
}
