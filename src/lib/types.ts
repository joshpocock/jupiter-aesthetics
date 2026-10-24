export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired";
export type DepositStatus = "unpaid" | "paid" | "refunded";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  role: "client" | "owner";
};

export type Intake = {
  client_id: string;
  medical_history: string;
  current_medications: string;
  allergies: string;
  consent_version: string;
  consent_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  client_id: string;
  slot_start: string;
  status: BookingStatus;
  deposit_status: DepositStatus;
  deposit_amount_cents: number;
  hold_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};
