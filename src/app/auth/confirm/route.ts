import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

const TYPES: EmailOtpType[] = ["recovery", "signup", "email", "email_change", "invite", "magiclink"];

/**
 * Email links that carry a token hash. Unlike the PKCE /auth/callback, these work when the
 * link opens in a different browser (e.g. a phone's mail app), so the Supabase "Reset
 * password" and "Confirm signup" email templates should point here (see README).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const recovery = type === "recovery";
  const next = safeNext(searchParams.get("next"), recovery ? "/account/password" : "/book");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    recovery ? `${origin}/forgot-password?expired=1` : `${origin}/login?next=${encodeURIComponent(next)}`,
  );
}
