// Checks the database rules against the real Supabase project:
// no double booking under concurrency, RLS isolation between clients, and that
// clients can't call the payment functions. Creates two throwaway users and deletes them.
//
//   node --env-file=.env.local scripts/verify-db.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function makeClient(label) {
  const email = `verify-${label}-${Date.now()}@example.test`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

/** Next Tuesday at 10:00 New York time, at least two days out. */
function testSlot(weeksAhead = 1) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7 * weeksAhead + ((9 - d.getUTCDay()) % 7));
  const day = d.toISOString().slice(0, 10);
  for (const offset of ["-04:00", "-05:00"]) {
    const t = new Date(`${day}T10:00:00${offset}`);
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "numeric", hourCycle: "h23",
    }).format(t);
    if (local === "10") return t.toISOString();
  }
  throw new Error("could not build slot");
}

const users = [];
try {
  const a = await makeClient("a");
  const b = await makeClient("b");
  users.push(a, b);

  check("profile row created by trigger", !!(await admin.from("profiles").select("id").eq("id", a.id).single()).data);

  const intake = (consent = true) => ({
    p_full_name: "Test Client", p_phone: "555-0100", p_date_of_birth: "1990-01-01", p_address: null,
    p_medical_history: "None", p_current_medications: "None", p_allergies: "None",
    p_consent: consent, p_consent_version: "test",
  });
  check("intake without consent is rejected",
    (await a.client.rpc("save_intake", intake(false))).error?.message === "consent_required");
  check("client can save own intake", !(await a.client.rpc("save_intake", intake())).error);
  check("client B can save own intake", !(await b.client.rpc("save_intake", intake())).error);
  check("client can't write intakes directly (bypassing consent)",
    !!(await b.client.from("intakes").insert({
      client_id: b.id, medical_history: "", current_medications: "", allergies: "",
      consent_version: "none", consent_at: "2000-01-01",
    })).error);

  const { data: leaked } = await b.client.from("intakes").select("*").eq("client_id", a.id);
  check("client B can't read client A's intake", (leaked ?? []).length === 0);

  const roleEdit = await a.client.from("profiles").update({ role: "owner" }).eq("id", a.id);
  check("client can't make themselves owner", !!roleEdit.error, roleEdit.error?.code);

  check("client can't insert bookings directly",
    !!(await a.client.from("bookings").insert({ client_id: a.id, slot_start: testSlot() })).error);

  // Fire both bookings for the same slot at the same moment.
  const slot = testSlot();
  const [ra, rb] = await Promise.all([
    a.client.rpc("create_pending_booking", { p_slot: slot }),
    b.client.rpc("create_pending_booking", { p_slot: slot }),
  ]);
  const winners = [ra, rb].filter((r) => !r.error);
  const loser = [ra, rb].find((r) => r.error);
  check("exactly one concurrent booking wins", winners.length === 1,
    `${winners.length} succeeded; loser said ${loser?.error?.message}`);
  check("loser gets slot_taken", loser?.error?.message === "slot_taken");

  const bad = await a.client.rpc("create_pending_booking", { p_slot: new Date(Date.parse(slot) + 15 * 60_000).toISOString() });
  check("off-grid time rejected", bad.error?.message === "slot_unavailable");

  const winnerId = ra.error ? b : a;
  const otherId = ra.error ? a : b;
  const bookingId = (ra.data ?? rb.data).id;

  const { data: seenByOther } = await otherId.client.from("bookings").select("id").eq("id", bookingId);
  check("other client can't see the booking", (seenByOther ?? []).length === 0);

  const { data: taken } = await otherId.client.rpc("taken_slots", {
    p_from: new Date().toISOString(), p_to: new Date(Date.now() + 60 * 86400_000).toISOString(),
  });
  check("taken_slots shows the held slot", (taken ?? []).some((t) => Date.parse(t) === Date.parse(slot)));

  const forged = await winnerId.client.rpc("confirm_booking_payment", {
    p_booking: bookingId, p_session: "cs_fake", p_payment_intent: null,
  });
  check("client can't mark own deposit paid", !!forged.error, forged.error?.code);

  const steal = await otherId.client.rpc("cancel_booking", { p_booking: bookingId });
  check("client can't cancel someone else's booking", steal.error?.message === "not_found");

  const confirmed = await admin.rpc("confirm_booking_payment", {
    p_booking: bookingId, p_session: "cs_test_verify", p_payment_intent: null,
  }).single();
  check("server confirms payment", confirmed.data?.status === "confirmed" && confirmed.data?.deposit_status === "paid");

  const again = await admin.rpc("confirm_booking_payment", {
    p_booking: bookingId, p_session: "cs_test_verify", p_payment_intent: null,
  }).single();
  check("confirmation is idempotent", again.data?.status === "confirmed");

  const second = await winnerId.client.rpc("create_pending_booking", { p_slot: testSlot(3) }).single();
  check("a client with a consultation can book another", !second.error && second.data?.status === "pending_payment",
    second.error?.message);

  const holdA = await otherId.client.rpc("create_pending_booking", { p_slot: testSlot(4) }).single();
  const holdB = await otherId.client.rpc("create_pending_booking", { p_slot: testSlot(5) }).single();
  const { data: holdAAfter } = await otherId.client.from("bookings").select("status").eq("id", holdA.data?.id).single();
  check("a new booking leaves the client's other unpaid hold alone",
    !holdB.error && holdAAfter?.status === "pending_payment", holdB.error?.message ?? holdAAfter?.status);

  const moved = await winnerId.client.rpc("reschedule_booking", { p_booking: bookingId, p_slot: testSlot(2) }).single();
  check("reschedule keeps deposit", moved.data?.deposit_status === "paid" && Date.parse(moved.data?.slot_start) === Date.parse(testSlot(2)));

  const freed = await otherId.client.rpc("create_pending_booking", { p_slot: slot });
  check("old slot is free after reschedule", !freed.error, freed.error?.message);

  // otherId already has three upcoming unpaid holds (testSlot 4, 5 and the freed slot).
  const fourth = await otherId.client.rpc("create_pending_booking", { p_slot: testSlot(6) });
  check("no limit on upcoming bookings per client", !fourth.error, fourth.error?.message);

  const cancelled = await winnerId.client.rpc("cancel_booking", { p_booking: bookingId }).single();
  check("cancel works and leaves deposit paid",
    cancelled.data?.status === "cancelled" && cancelled.data?.deposit_status === "paid");

  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: anonRows } = await anon.from("bookings").select("id");
  check("signed-out visitors see no bookings", (anonRows ?? []).length === 0);
  check("signed-out visitors can't call taken_slots",
    !!(await anon.rpc("taken_slots", { p_from: new Date().toISOString(), p_to: new Date().toISOString() })).error);
} finally {
  for (const u of users) await admin.auth.admin.deleteUser(u.id);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
