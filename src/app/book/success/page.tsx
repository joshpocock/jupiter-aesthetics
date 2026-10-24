import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { confirmFromSession } from "@/lib/payments";
import { formatSlot } from "@/lib/schedule";
import { stripe } from "@/lib/stripe";
import type { Booking } from "@/lib/types";
import { ContactUs } from "@/components/contact";
import { PageShell } from "@/components/brand";
import { BookingSteps } from "../booking-steps";

export const metadata: Metadata = { title: "You're booked" };

function Message({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="card rise text-center">
      <span className="planet mx-auto block size-16" aria-hidden />
      <p className="eyebrow mt-8">{eyebrow}</p>
      <h1 className="heading mt-4">{title}</h1>
      <div className="lede mx-auto mt-5 max-w-md">{children}</div>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/book/success">["searchParams"] }) {
  const { session_id } = await searchParams;
  const { supabase } = await requireUser(
    typeof session_id === "string" ? `/book/success?session_id=${encodeURIComponent(session_id)}` : "/account",
  );

  // Don't wait for the webhook: confirm straight from Stripe. Both paths are idempotent.
  if (typeof session_id === "string" && session_id.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      await confirmFromSession(session);
    } catch (err) {
      console.error("Could not confirm Checkout session", session_id, err);
    }
  }

  // RLS: this only finds the booking if it belongs to the signed-in client.
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("stripe_checkout_session_id", typeof session_id === "string" ? session_id : "")
    .maybeSingle<Booking>();

  if (!booking || booking.deposit_status !== "paid") {
    return (
      <Message
        eyebrow="Almost there"
        title="Confirming your payment"
        actions={<Link href="/account" className="btn-primary btn-lg">Go to my bookings</Link>}
      >
        This usually takes a few seconds. Your booking will show as confirmed in your account as soon as
        Stripe lets us know.
      </Message>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <Message
        eyebrow="Payment received"
        title="Your time was released"
        actions={<Link href="/account" className="btn-primary btn-lg">Go to my bookings</Link>}
      >
        Your hold ran out before payment finished and that time is no longer available. Your $50 deposit
        is recorded against your account; please <ContactUs /> to arrange a new time.
      </Message>
    );
  }

  return (
    <Message
      eyebrow="You're booked"
      title={formatSlot(booking.slot_start)}
      actions={
        <>
          <a href={`/account/bookings/${booking.id}/calendar`} className="btn-primary btn-lg">
            Add to calendar
          </a>
          <Link href="/account" className="btn-secondary btn-lg">
            View my bookings
          </Link>
        </>
      }
    >
      Your deposit is paid and your complimentary consultation is confirmed. We look forward to meeting you.
      You can reschedule or cancel online up to 24 hours before.
    </Message>
  );
}

export default function Page({ searchParams }: PageProps<"/book/success">) {
  return (
    <PageShell>
      <BookingSteps current={4} />
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
