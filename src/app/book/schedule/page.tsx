import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatSlot, slotDaysKey } from "@/lib/schedule";
import { loadSlotDays } from "@/lib/slots";
import { PageHeader, PageShell } from "@/components/brand";
import { SlotPicker } from "@/components/slot-picker";
import { BookingSteps } from "../booking-steps";
import { bookSlot } from "../actions";

export const metadata: Metadata = { title: "Choose a time" };

async function Content() {
  const { supabase, user } = await requireUser("/book/schedule");

  const { data: intake } = await supabase
    .from("intakes")
    .select("client_id")
    .eq("client_id", user.id)
    .maybeSingle();
  if (!intake) redirect("/book/intake");

  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, slot_start")
    .eq("client_id", user.id)
    .eq("status", "confirmed")
    .gt("slot_start", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  const days = await loadSlotDays(supabase);
  return (
    <>
      {/* This page always books a new consultation; moving an existing one is Reschedule. */}
      {upcoming && (
        <p className="panel mb-6 text-[0.9375rem] leading-relaxed">
          You already have a consultation on <span className="font-medium">{formatSlot(upcoming.slot_start)}</span>.
          Choosing a time here books an additional consultation with its own $50 deposit. To move your existing
          one instead,{" "}
          <Link href={`/account/bookings/${upcoming.id}/reschedule`} className="link">
            reschedule it
          </Link>
          .
        </p>
      )}
      <SlotPicker
        key={slotDaysKey(days)}
        days={days}
        action={bookSlot}
        submitLabel="Continue to deposit"
        note="We'll hold your time for 30 minutes while you pay."
      />
    </>
  );
}

export default function Page() {
  return (
    <PageShell width="lg">
      <BookingSteps current={2} />
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader eyebrow="Complimentary · 30 minutes" title={<>Choose <span className="italic">a time</span></>} />
        <Link href="/book/intake?next=/book/schedule" className="link inline-flex min-h-11 shrink-0 items-center self-start text-[0.9375rem] sm:mb-1 sm:self-auto">
          Edit my details
        </Link>
      </div>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-[28rem] animate-pulse" />}>
          <Content />
        </Suspense>
      </div>
    </PageShell>
  );
}
