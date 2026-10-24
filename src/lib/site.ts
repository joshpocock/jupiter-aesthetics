import "server-only";
import { headers } from "next/headers";

/**
 * The origin to put in links that bring people back here (Stripe Checkout, email links).
 * NEXT_PUBLIC_SITE_URL wins when set (local dev, and the production domain later). Otherwise
 * use the host this request arrived on, so a preview deployment sends people back to itself
 * and their sign-in cookie still applies. On Vercel the host is always one of the project's
 * own domains, and Supabase only honours email redirects on its allow-list.
 */
export async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Cannot determine the site URL for this request");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
