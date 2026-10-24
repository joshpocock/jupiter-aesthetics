import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { loadOwnerRows, money, parseView, VIEWS, type OwnerRow, type View } from "@/lib/owner";
import { formatSlot, SPA_TIME_ZONE } from "@/lib/schedule";
import { PageShell } from "@/components/brand";
import { BookingBadge, DepositBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "All bookings" };

const paidOn = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: SPA_TIME_ZONE });

function Stat({ label, value, tone = "" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl bg-linen px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 font-serif text-3xl leading-none font-medium lining-nums tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function Deposit({ row }: { row: OwnerRow }) {
  return (
    <div>
      <DepositBadge status={row.deposit_status} />
      {row.paid_at && (
        <p className="mt-1.5 text-xs text-muted">
          {money(row.deposit_amount_cents)} on {paidOn(row.paid_at)}
        </p>
      )}
      {row.deposit_status === "paid" && row.status !== "confirmed" && (
        <p className="mt-1.5 text-xs font-medium text-amber">Review refund</p>
      )}
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/owner">["searchParams"] }) {
  const { view: rawView, q: rawQ } = await searchParams;
  const view = parseView(rawView);
  const q = typeof rawQ === "string" ? rawQ.slice(0, 100) : "";
  const { supabase } = await requireOwner();
  const rows = await loadOwnerRows(supabase, view, q);

  const confirmed = rows.filter((r) => r.status === "confirmed").length;
  const paid = rows.filter((r) => r.deposit_status === "paid");
  const needsReview = rows.filter((r) => r.deposit_status === "paid" && r.status !== "confirmed").length;
  const params = (v: View) => `/owner?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" aria-label="Filter bookings">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <Link
              key={v}
              href={params(v)}
              aria-current={v === view ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-[0.9375rem] transition-colors ${
                v === view ? "border-ink bg-ink text-ivory" : "border-line-strong bg-shell hover:border-ink"
              }`}
            >
              {VIEWS[v]}
            </Link>
          ))}
        </nav>
        <form className="flex min-w-0 gap-2" role="search">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="q" className="sr-only">Search clients</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search name, email or phone"
            className="input min-h-11 min-w-0 flex-1 py-2 lg:w-72 lg:flex-none"
          />
          <button className="btn-secondary min-h-11 shrink-0 px-5">Search</button>
        </form>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bookings" value={rows.length} />
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Deposits paid" value={money(paid.reduce((s, r) => s + r.deposit_amount_cents, 0))} />
        <Stat label="Paid, not attending" value={needsReview} tone={needsReview ? "text-amber" : ""} />
      </dl>

      {rows.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="subheading">{q ? "No matching bookings." : "No bookings here yet."}</p>
          <p className="mt-3 text-muted">New bookings appear here as soon as they&apos;re made.</p>
        </div>
      ) : (
        <>
          {/* Phones: one card per booking. */}
          <ul className="mt-8 space-y-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-[1.5rem] border border-line bg-shell p-5 shadow-soft">
                <p className="font-serif text-xl leading-snug font-medium">{formatSlot(r.slot_start)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BookingBadge status={r.status} />
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="font-medium">{r.client?.full_name ?? "—"}</p>
                  {r.client?.email && (
                    <a href={`mailto:${r.client.email}`} className="flex min-h-11 items-center break-all text-[0.9375rem] text-muted">
                      {r.client.email}
                    </a>
                  )}
                  {r.client?.phone && (
                    <a href={`tel:${r.client.phone}`} className="flex min-h-11 items-center text-[0.9375rem] text-muted">
                      {r.client.phone}
                    </a>
                  )}
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <Deposit row={r} />
                  {r.client && (
                    <Link href={`/owner/clients/${r.client.id}`} className="btn-secondary min-h-11 px-5 text-sm">
                      Intake
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: a table. */}
          <div className="mt-8 hidden overflow-hidden rounded-[1.75rem] border border-line bg-shell shadow-soft lg:block">
            <table className="w-full text-left text-[0.9375rem]">
              <thead className="border-b border-line bg-linen/50 text-xs tracking-[0.12em] text-muted uppercase">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">When</th>
                  <th scope="col" className="px-6 py-4 font-medium">Client</th>
                  <th scope="col" className="px-6 py-4 font-medium">Booking</th>
                  <th scope="col" className="px-6 py-4 font-medium">Deposit</th>
                  <th scope="col" className="px-6 py-4"><span className="sr-only">Intake</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top transition-colors hover:bg-ivory/60">
                    <td className="px-6 py-5">{formatSlot(r.slot_start)}</td>
                    <td className="px-6 py-5">
                      <p className="font-medium">{r.client?.full_name ?? "—"}</p>
                      <p className="text-muted">{r.client?.email}</p>
                      {r.client?.phone && <p className="text-muted">{r.client.phone}</p>}
                    </td>
                    <td className="px-6 py-5"><BookingBadge status={r.status} /></td>
                    <td className="px-6 py-5"><Deposit row={r} /></td>
                    <td className="px-6 py-5 text-right">
                      {r.client && (
                        <Link href={`/owner/clients/${r.client.id}`} className="link whitespace-nowrap">
                          View intake
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-8 flex justify-end">
        <a href={`/owner/export?view=${view}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="btn-ghost">
          Download CSV
        </a>
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/owner">) {
  return (
    <PageShell width="xl">
      <header className="rise">
        <p className="eyebrow">Owner</p>
        <h1 className="heading mt-4">All bookings</h1>
      </header>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
