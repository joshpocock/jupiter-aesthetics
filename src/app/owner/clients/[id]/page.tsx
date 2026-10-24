import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { formatSlot, SPA_TIME_ZONE } from "@/lib/schedule";
import type { Booking, Intake, Profile } from "@/lib/types";
import { PageShell } from "@/components/brand";
import { BookingBadge, DepositBadge } from "@/components/status-badge";
import { effectiveStatus } from "@/lib/booking-state";

export const metadata: Metadata = { title: "Client intake", robots: { index: false } };

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1.5 text-[1.0625rem] leading-relaxed break-words whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

function ageFrom(dob: string, now = new Date()) {
  const d = new Date(`${dob}T12:00:00Z`);
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

async function Content({ params }: { params: PageProps<"/owner/clients/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requireOwner();

  const [{ data: client }, { data: intake }, { data: bookings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    supabase.from("intakes").select("*").eq("client_id", id).maybeSingle<Intake>(),
    supabase.from("bookings").select("*").eq("client_id", id).order("slot_start", { ascending: false }),
  ]);
  if (!client) notFound();

  const dob = client.date_of_birth
    ? `${new Date(`${client.date_of_birth}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "long" })} (age ${ageFrom(client.date_of_birth)})`
    : null;

  return (
    <>
      <header className="rise">
        <p className="eyebrow">Client</p>
        <h1 className="heading mt-4">{client.full_name ?? client.email}</h1>
      </header>

      <section className="card mt-10" aria-labelledby="contact">
        <h2 id="contact" className="eyebrow">Contact</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Email" value={<a href={`mailto:${client.email}`} className="link">{client.email}</a>} />
          <Field label="Mobile" value={client.phone && <a href={`tel:${client.phone}`} className="link">{client.phone}</a>} />
          <Field label="Date of birth" value={dob} />
          <Field label="Address" value={client.address} />
        </dl>
      </section>

      <section className="card mt-6" aria-labelledby="health">
        <h2 id="health" className="eyebrow">Health information</h2>
        {intake ? (
          <>
            <dl className="mt-6 grid gap-6">
              <Field label="Medical history" value={intake.medical_history} wide />
              <Field label="Current medications" value={intake.current_medications} wide />
              <Field label="Allergies" value={intake.allergies} wide />
            </dl>
            <p className="mt-8 border-t border-line pt-5 text-sm text-muted">
              Consent ({intake.consent_version}) given{" "}
              {new Date(intake.consent_at).toLocaleString("en-US", { timeZone: SPA_TIME_ZONE, dateStyle: "medium", timeStyle: "short" })}{" "}
              Eastern
            </p>
          </>
        ) : (
          <p className="mt-6 text-muted">No intake form yet.</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="bookings">
        <h2 id="bookings" className="eyebrow text-muted">Bookings</h2>
        <ul className="mt-4 divide-y divide-line rounded-[1.75rem] border border-line bg-shell">
          {((bookings ?? []) as Booking[]).map((b) => (
            <li key={b.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <span>{formatSlot(b.slot_start)}</span>
              <span className="flex flex-wrap gap-2">
                <BookingBadge status={effectiveStatus(b)} />
                <DepositBadge status={b.deposit_status} />
              </span>
            </li>
          ))}
          {(bookings ?? []).length === 0 && <li className="px-6 py-5 text-muted">No bookings.</li>}
        </ul>
      </section>
    </>
  );
}

export default function Page({ params }: PageProps<"/owner/clients/[id]">) {
  return (
    <PageShell>
      <Link href="/owner" className="btn-ghost -ml-4">
        ← All bookings
      </Link>
      <div className="mt-6">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Content params={params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
