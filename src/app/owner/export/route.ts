import { NextResponse, type NextRequest } from "next/server";
import { signInRedirect } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { loadOwnerRows, parseView } from "@/lib/owner";
import { SPA_TIME_ZONE } from "@/lib/schedule";

// Contact and booking details only; health information never leaves the app.
const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheets treating it as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const local = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { timeZone: SPA_TIME_ZONE }) : "";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Browsers follow these, so an expired session goes through sign-in and straight back here.
  if (!user) return signInRedirect(request);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return NextResponse.redirect(new URL("/account", request.url));

  const view = parseView(request.nextUrl.searchParams.get("view"));
  const rows = await loadOwnerRows(supabase, view, request.nextUrl.searchParams.get("q") ?? "");

  const header = ["Appointment (Eastern)", "Client", "Email", "Phone", "Status", "Deposit", "Amount", "Paid at (Eastern)"];
  const lines = rows.map((r) =>
    [
      local(r.slot_start),
      r.client?.full_name,
      r.client?.email,
      r.client?.phone,
      r.status,
      r.deposit_status,
      (r.deposit_amount_cents / 100).toFixed(2),
      local(r.paid_at),
    ]
      .map(csvCell)
      .join(","),
  );
  const date = new Date().toISOString().slice(0, 10);

  // The byte-order mark makes Excel read accented names correctly.
  return new Response("﻿" + [header.join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jupiter-bookings-${view}-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
