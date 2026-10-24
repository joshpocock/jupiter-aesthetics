// Disposable, isolated accounts for automated end-to-end tests. Give every scenario its own
// account so scenarios can't cancel or replace each other's bookings.
//
//   node --env-file=.env.local scripts/test-accounts.mjs create <state> [--base-url URL] [--out FILE]
//   node --env-file=.env.local scripts/test-accounts.mjs cleanup
//
// <state> is one of:
//   new        signed up, no intake yet (sign-up/intake journeys)
//   intake     intake done, nothing booked (browse days, book a new consultation)
//   unpaid     intake done + an upcoming unpaid hold with an open $50 Stripe Checkout
//   released   intake done + an unpaid hold that was released (Resume payment journeys)
//   confirmed  intake done + a confirmed consultation with the deposit paid (reschedule, cancel)
//   owner      intake done + owner role (owner view, CSV export)
//
// `create` writes { email, password, state, bookingId?, slot? } to --out (default
// .test-account.json, git-ignored) for the test runner to read; the password is never printed.
// Only addresses on the reserved example.test domain are ever created or deleted.
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const DOMAIN = "example.test";
const STATES = ["new", "intake", "unpaid", "released", "confirmed", "owner"];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

/** A bookable slot (Mon-Sat, 9:00-16:30 New York) at least `daysAhead` days out, free right now. */
async function freeSlot(daysAhead) {
  const { data: taken } = await admin
    .from("bookings")
    .select("slot_start")
    .in("status", ["confirmed", "pending_payment"]);
  const busy = new Set((taken ?? []).map((b) => Date.parse(b.slot_start)));
  for (let d = daysAhead; d < daysAhead + 30; d++) {
    const day = new Date(Date.now() + d * 86400_000);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(day);
    const weekday = new Date(`${ymd}T12:00:00Z`).getUTCDay();
    if (weekday === 0) continue;
    for (let minutes = 9 * 60; minutes <= 16 * 60 + 30; minutes += 30) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      for (const offset of ["-04:00", "-05:00"]) {
        const t = new Date(`${ymd}T${hh}:${mm}:00${offset}`);
        const local = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).format(t);
        if (local === `${hh}:${mm}` && !busy.has(t.getTime())) return t.toISOString();
      }
    }
  }
  throw new Error("No free slot found");
}

async function create(state) {
  if (!STATES.includes(state)) throw new Error(`state must be one of: ${STATES.join(", ")}`);
  const email = `e2e-${state}-${Date.now()}-${randomBytes(3).toString("hex")}@${DOMAIN}`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `E2E ${state}` },
  });
  if (error) throw error;
  const id = data.user.id;
  const out = { email, password, state };

  if (state !== "new") {
    await admin.from("profiles")
      .update({ phone: "555-010-0100", date_of_birth: "1990-01-01", role: state === "owner" ? "owner" : "client" })
      .eq("id", id);
    const r = await admin.from("intakes").insert({
      client_id: id, medical_history: "None", current_medications: "None", allergies: "None",
      consent_version: "2026-10-v1",
    });
    if (r.error) throw r.error;
  }

  if (state === "confirmed") {
    const slot = await freeSlot(3);
    const { data: b, error: e } = await admin.from("bookings").insert({
      client_id: id, slot_start: slot, status: "confirmed", deposit_status: "paid", paid_at: new Date().toISOString(),
    }).select("id").single();
    if (e) throw e;
    Object.assign(out, { bookingId: b.id, slot });
  }

  if (state === "unpaid" || state === "released") {
    const slot = await freeSlot(4);
    const { data: b, error: e } = await admin.from("bookings").insert({
      client_id: id, slot_start: slot,
      status: state === "unpaid" ? "pending_payment" : "expired",
      hold_expires_at: new Date(Date.now() + (state === "unpaid" ? 35 : -5) * 60_000).toISOString(),
    }).select("id").single();
    if (e) throw e;
    Object.assign(out, { bookingId: b.id, slot });

    if (state === "unpaid") {
      // A real open Checkout, so "Pay $50 deposit" can reopen it.
      const base = arg("--base-url", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        allowed_payment_method_types: ["card"],
        customer_email: email,
        client_reference_id: b.id,
        metadata: { booking_id: b.id },
        payment_intent_data: { metadata: { booking_id: b.id } },
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 5000, product_data: { name: "Consultation deposit" } } }],
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${base}/book/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/book/cancelled?booking=${b.id}`,
      });
      const r = await admin.rpc("attach_checkout_session", { p_booking: b.id, p_session: session.id });
      if (r.error) throw r.error;
    }
  }

  const file = arg("--out", ".test-account.json");
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Created ${state} account ${email} -> ${file}`);
}

async function cleanup() {
  let deleted = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const mine = data.users.filter((u) => u.email?.toLowerCase().endsWith(`@${DOMAIN}`));
    for (const u of mine) {
      const { data: open } = await admin.from("bookings")
        .select("stripe_checkout_session_id").eq("client_id", u.id).eq("status", "pending_payment");
      for (const b of open ?? []) {
        if (!b.stripe_checkout_session_id) continue;
        const s = await stripe.checkout.sessions.retrieve(b.stripe_checkout_session_id);
        if (s.status === "open") await stripe.checkout.sessions.expire(s.id);
      }
      await admin.auth.admin.deleteUser(u.id); // bookings and intake cascade
      deleted++;
    }
    if (data.users.length < 1000) break;
  }
  console.log(`Deleted ${deleted} @${DOMAIN} test account(s).`);
}

const [command, state] = process.argv.slice(2);
if (command === "create") await create(state);
else if (command === "cleanup") await cleanup();
else {
  console.error("Usage: test-accounts.mjs create <state> [--base-url URL] [--out FILE] | cleanup");
  process.exit(1);
}
