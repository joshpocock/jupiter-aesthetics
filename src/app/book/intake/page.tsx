import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser, safeNext } from "@/lib/auth";
import type { Intake } from "@/lib/types";
import { PageHeader, PageShell } from "@/components/brand";
import { BookingSteps } from "../booking-steps";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = { title: "Your details" };

async function Content({ searchParams }: { searchParams: PageProps<"/book/intake">["searchParams"] }) {
  const { next: rawNext } = await searchParams;
  const next = typeof rawNext === "string" ? safeNext(rawNext, "/book/schedule") : undefined;
  const { supabase, user, profile } = await requireUser("/book/intake");
  const { data: intake } = await supabase
    .from("intakes")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle<Intake>();
  const editing = next === "/account";

  return (
    <>
      {editing ? (
        <Link href="/account" className="btn-ghost -ml-4">← My bookings</Link>
      ) : (
        <BookingSteps current={1} />
      )}
      <div className="mt-10">
        <PageHeader
          eyebrow={editing ? "Your details" : "New client"}
          title={editing ? "Update your details" : <>A little <span className="italic">about you</span></>}
        >
          {editing
            ? "Keep your health information current so we can care for you safely."
            : "This helps us prepare for your consultation. It takes about five minutes."}
        </PageHeader>
      </div>
      <div className="mt-10">
        {/* Keyed on the saved version: Next keeps visited pages mounted, and uncontrolled inputs
            only read defaultValue on mount, so without a remount a reopened form shows old answers. */}
        <IntakeForm key={intake?.updated_at ?? "new"} profile={profile} intake={intake} next={next} />
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/book/intake">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="card h-[32rem] animate-pulse" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
