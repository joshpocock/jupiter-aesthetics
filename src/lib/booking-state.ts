import { MIN_LEAD_HOURS } from "@/lib/schedule";
import type { Booking, BookingStatus } from "@/lib/types";

// The database marks unpaid holds "expired" lazily (when something next touches them), so a
// pending_payment row can be past its hold. Every screen derives the status shown from these.

type BookingLike = Pick<Booking, "status" | "deposit_status" | "slot_start" | "hold_expires_at">;

/** The status to show: a pending hold whose time has run out is shown as expired. */
export function effectiveStatus(b: BookingLike, now = new Date()): BookingStatus {
  if (b.status === "pending_payment" && (!b.hold_expires_at || new Date(b.hold_expires_at) <= now)) {
    return "expired";
  }
  return b.status;
}

/** Belongs under Upcoming: a confirmed future consultation, or an unpaid hold that's still held. */
export function isActive(b: BookingLike, now = new Date()) {
  const status = effectiveStatus(b, now);
  return (
    (status === "confirmed" && new Date(b.slot_start) > now) ||
    status === "pending_payment"
  );
}

/** An unpaid hold that was released but whose time is still far enough ahead to book again. */
export function isResumable(b: BookingLike, now = new Date()) {
  return (
    effectiveStatus(b, now) === "expired" &&
    b.deposit_status === "unpaid" &&
    new Date(b.slot_start).getTime() >= now.getTime() + MIN_LEAD_HOURS * 3600_000
  );
}
