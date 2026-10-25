import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canChange, formatSlot } from "@/lib/schedule";
import { loadSlotDays } from "@/lib/slots";
import type { Booking } from "@/lib/types";
import { PageHeader, PageShell } from "@/components/brand";
import { ContactUs } from "@/components/contact";
import { SlotPicker } from "@/components/slot-picker";
import { rescheduleBooking } from "../../../actions";

export const metadata: Metadata = { title: "Reschedule" };

async function Content({ params }: { params: PageProps<"/account/bookings/[id]/reschedule">["params"] }) {
  const { id } = await params;
  const { supabase, user } = await requireUser(`/account/bookings/${id}/reschedule`);
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle<Booking>();
  if (!booking || booking.status !== "confirmed") notFound();

  const header = (
    <PageHeader eyebrow="Reschedule" title={<>Choose a <span className="italic">new time</span></>}>
      Currently <span className="text-ink">{formatSlot(booking.slot_start)}</span>. Your deposit moves with you.
    </PageHeader>
  );

  if (!canChange(booking.slot_start)) {
    return (
      <>
        {header}
        <div className="card mt-10">
          <p>
            Your consultation is less than 24 hours away, so it can&apos;t be moved online. Please <ContactUs />.
          </p>
          <Link href="/account" className="btn-secondary mt-8">
            Back to my bookings
          </Link>
        </div>
      </>
    );
  }

  const days = await loadSlotDays(supabase, booking.slot_start);
  return (
    <>
      {header}
      <div className="mt-10">
        <SlotPicker
          key={booking.slot_start}
          days={days}
          action={rescheduleBooking}
          submitLabel="Move my consultation"
          current={new Date(booking.slot_start).toISOString()}
          hidden={{ booking_id: booking.id }}
        />
      </div>
    </>
  );
}

export default function Page({ params }: PageProps<"/account/bookings/[id]/reschedule">) {
  return (
    <PageShell width="lg">
      <Link href="/account" className="btn-ghost -ml-4">
        ← My bookings
      </Link>
      <div className="mt-6">
        <Suspense fallback={<div className="card h-[28rem] animate-pulse" />}>
          <Content params={params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
