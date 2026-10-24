import { NextResponse, type NextRequest } from "next/server";

/** For route handlers: send a signed-out visitor to sign in, then back to this exact URL. */
export function signInRedirect(request: NextRequest | Request) {
  const url = new URL(request.url);
  const login = new URL("/login", url);
  login.searchParams.set("next", url.pathname + url.search);
  return NextResponse.redirect(login);
}
