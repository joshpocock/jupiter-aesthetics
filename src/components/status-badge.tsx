import type { BookingStatus, DepositStatus } from "@/lib/types";

const BOOKING: Record<BookingStatus, [string, string]> = {
  confirmed: ["Confirmed", "bg-sage/10 text-sage"],
  pending_payment: ["Awaiting deposit", "bg-amber/10 text-amber"],
  cancelled: ["Cancelled", "bg-linen text-muted"],
  expired: ["Hold expired", "bg-linen text-muted"],
};

const DEPOSIT: Record<DepositStatus, [string, string]> = {
  paid: ["Deposit paid", "bg-sage/10 text-sage"],
  unpaid: ["Deposit unpaid", "bg-amber/10 text-amber"],
  refunded: ["Refunded", "bg-linen text-muted"],
};

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-[0.02em] whitespace-nowrap ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  );
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  const [label, tone] = BOOKING[status];
  return <Badge label={label} tone={tone} />;
}

export function DepositBadge({ status }: { status: DepositStatus }) {
  const [label, tone] = DEPOSIT[status];
  return <Badge label={label} tone={tone} />;
}
