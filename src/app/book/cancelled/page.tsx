import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/brand";
import { BookingSteps } from "../booking-steps";
import { ReleaseHold } from "./release-hold";

export const metadata: Metadata = { title: "Payment not completed" };

async function Release({ searchParams }: { searchParams: PageProps<"/book/cancelled">["searchParams"] }) {
  const { booking } = await searchParams;
  return <ReleaseHold bookingId={typeof booking === "string" ? booking : ""} />;
}

// Stripe sends people here when they back out of Checkout. Releasing the hold is a POST,
// so following a link to this page can't cancel anything.
export default function Page({ searchParams }: PageProps<"/book/cancelled">) {
  return (
    <PageShell>
      <BookingSteps current={3} />
      <div className="card rise mt-10">
        <p className="eyebrow">No charge made</p>
        <h1 className="heading mt-4">Payment not completed</h1>
        <p className="lede mt-5">
          We&apos;re still holding your time for a few minutes. You can finish paying from your account, or
          release it and choose another time.
        </p>
        <div className="mt-10">
          <Suspense>
            <Release searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
