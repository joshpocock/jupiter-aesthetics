import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// PKCE email links land here with a code. They only work in the browser that asked for the
// email; /auth/confirm handles token-hash links that work anywhere.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/book");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  if (next === "/account/password") return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);
}
