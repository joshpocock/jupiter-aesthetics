import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { canChange, formatSlot, SPA_TIME_ZONE } from "@/lib/schedule";
import type { Booking } from "@/lib/types";
import { PageShell } from "@/components/brand";
import { Notice } from "@/components/form-alert";
import { BookingBadge, DepositBadge } from "@/components/status-badge";
import { BookingActions } from "./booking-actions";

export const metadata: Metadata = { title: "My bookings" };

function splitBookings(bookings: Booking[], now = new Date()) {
  const t = now.getTime();
  const active = bookings.filter(
    (b) =>
      (b.status === "confirmed" && new Date(b.slot_start).getTime() > t) ||
      (b.status === "pending_payment" && b.hold_expires_at && new Date(b.hold_expires_at).getTime() > t),
  );
  return { active: active.reverse(), history: bookings.filter((b) => !active.includes(b)) };
}

const NOTICES: Record<string, string> = {
  rescheduled: "Your consultation has been moved. We've kept your deposit with it.",
  cancelled: "Your booking has been cancelled.",
  password: "Your password has been updated.",
};

const holdTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: SPA_TIME_ZONE, hour: "numeric", minute: "2-digit" });

async function Content({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const { changed } = await searchParams;
  const { supabase, profile } = await requireUser("/account");
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("client_id", profile.id)
    .order("slot_start", { ascending: false });

  const { active, history } = splitBookings((data ?? []) as Booking[]);
  const notice = typeof changed === "string" ? NOTICES[changed] : undefined;
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <>
      <header className="rise">
        <p className="eyebrow">Your account</p>
        <h1 className="heading mt-4">
          {firstName ? (
            <>
              Hello, <span className="italic">{firstName}</span>
            </>
          ) : (
            "Hello"
          )}
        </h1>
      </header>

      {notice && (
        <div className="mt-8">
          <Notice>{notice}</Notice>
        </div>
      )}

      <section className="mt-12" aria-labelledby="upcoming">
        <h2 id="upcoming" className="eyebrow text-muted">Upcoming</h2>
        <div className="mt-4 space-y-4">
          {active.length === 0 ? (
            <div className="card">
              <p className="subheading">No consultation booked yet.</p>
              <p className="mt-3 text-muted">Choose a time that suits you. It only takes a few minutes.</p>
              <Link href="/book" className="btn-primary btn-lg mt-8 w-full sm:w-auto">
                Book a consultation
              </Link>
            </div>
          ) : (
            active.map((b) => (
              <article key={b.id} className="card rise">
                <div className="flex flex-wrap gap-2">
                  <BookingBadge status={b.status} />
                  <DepositBadge status={b.deposit_status} />
                </div>
                <p className="mt-5 font-serif text-[1.875rem] leading-tight font-medium sm:text-4xl">
                  {formatSlot(b.slot_start)}
                </p>
                <p className="mt-2 text-muted">Complimentary consultation · 30 minutes</p>
                {b.status === "pending_payment" && b.hold_expires_at && (
                  <p className="mt-5 rounded-2xl bg-amber/8 px-5 py-4 text-[0.9375rem] text-amber">
                    We&apos;re holding this time until {holdTime(b.hold_expires_at)} Eastern while you pay the
                    deposit.
                  </p>
                )}
                <div className="mt-8 border-t border-line pt-6">
                  <BookingActions id={b.id} status={b.status} changeable={canChange(b.slot_start)} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-14" aria-labelledby="history">
          <h2 id="history" className="eyebrow text-muted">Past and cancelled</h2>
          <ul className="mt-4 divide-y divide-line rounded-[1.75rem] border border-line bg-shell">
            {history.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <span>{formatSlot(b.slot_start)}</span>
                <span className="flex flex-wrap gap-2">
                  <BookingBadge status={b.status} />
                  <DepositBadge status={b.deposit_status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14" aria-labelledby="details">
        <h2 id="details" className="eyebrow text-muted">Your details</h2>
        <div className="panel mt-4">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Email</dt>
              <dd className="mt-1 break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Mobile</dt>
              <dd className="mt-1">{profile.phone ?? "Not added yet"}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/book/intake?next=/account" className="btn-secondary">
              Update health &amp; contact details
            </Link>
            <Link href="/account/password" className="btn-ghost">
              Change password
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/account">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="card h-80 animate-pulse" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
