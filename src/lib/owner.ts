import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, Profile } from "@/lib/types";

export type OwnerRow = Booking & { client: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null };

export const VIEWS = {
  upcoming: "Upcoming",
  past: "Past",
  cancelled: "Cancelled & expired",
  all: "All",
} as const;
export type View = keyof typeof VIEWS;

export function parseView(raw: unknown): View {
  return typeof raw === "string" && raw in VIEWS ? (raw as View) : "upcoming";
}

/** Bookings for the owner view. RLS already restricts this to owners; callers also check the role. */
export async function loadOwnerRows(supabase: SupabaseClient, view: View, search = "", now = new Date()) {
  const iso = now.toISOString();
  let query = supabase
    .from("bookings")
    .select("*, client:profiles(id, full_name, email, phone)")
    .order("slot_start", { ascending: view === "upcoming" });
  if (view === "upcoming") query = query.in("status", ["confirmed", "pending_payment"]).gte("slot_start", iso);
  if (view === "past") query = query.eq("status", "confirmed").lt("slot_start", iso);
  if (view === "cancelled") query = query.in("status", ["cancelled", "expired"]);

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  const q = search.trim().toLowerCase();
  const rows = (data ?? []) as OwnerRow[];
  return q
    ? rows.filter((r) =>
        [r.client?.full_name, r.client?.email, r.client?.phone].some((v) => v?.toLowerCase().includes(q)),
      )
    : rows;
}

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
