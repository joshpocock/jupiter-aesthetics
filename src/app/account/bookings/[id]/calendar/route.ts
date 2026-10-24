import { createClient } from "@/lib/supabase/server";
import { SLOT_MINUTES } from "@/lib/schedule";
import { siteUrl } from "@/lib/site";
import type { Booking } from "@/lib/types";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 folds lines longer than 75 octets onto continuation lines that start with a space. */
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  return [...parts, rest].join("\r\n");
}

/** An .ics file so clients can add their consultation to Apple, Google or Outlook calendars. */
export async function GET(_request: Request, ctx: RouteContext<"/account/bookings/[id]/calendar">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("client_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle<Booking>();
  if (!booking) return new Response("Not found", { status: 404 });

  const start = new Date(booking.slot_start);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
  const site = await siteUrl();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jupiter Aesthetics//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@jupiter-aesthetics`,
    // Bumps on every change, so calendars replace a rescheduled event instead of ignoring it.
    `SEQUENCE:${Math.floor(new Date(booking.updated_at).getTime() / 1000)}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:Consultation at Jupiter Aesthetics",
    `DESCRIPTION:Your complimentary 30-minute consultation. Manage your booking at ${site}/account`,
    `URL:${site}/account`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Consultation at Jupiter Aesthetics tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jupiter-aesthetics-consultation.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
