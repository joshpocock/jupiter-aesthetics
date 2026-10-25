const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  consent_required: "Please tick the consent box to continue.",
  contact_required: "Please fill in your name, phone and date of birth.",
  intake_required: "Please complete your intake form first.",
  slot_unavailable: "That time can't be booked. Please pick another.",
  slot_taken: "Someone just booked that time. Please pick another.",
  not_found: "We couldn't find that booking.",
  not_confirmed: "Only confirmed bookings can be rescheduled.",
  not_active: "That booking is no longer active.",
  too_late_to_change: "Bookings can only be changed more than 24 hours ahead. Please call us.",
};

/** Turns a raised Postgres exception code from our booking functions into a client message. */
export function bookingErrorMessage(error: { message?: string } | null) {
  const code = error?.message?.trim() ?? "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
