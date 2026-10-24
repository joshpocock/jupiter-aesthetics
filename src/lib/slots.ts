import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSlotDays, HORIZON_DAYS } from "@/lib/schedule";

/** Bookable days for the calendar. `keep` stays selectable (the client's own current slot). */
export async function loadSlotDays(supabase: SupabaseClient, keep?: string) {
  const now = new Date();
  const { data, error } = await supabase.rpc("taken_slots", {
    p_from: now.toISOString(),
    p_to: new Date(now.getTime() + (HORIZON_DAYS + 1) * 86400_000).toISOString(),
  });
  if (error) throw error;

  const taken = new Set((data as string[]).map((iso) => new Date(iso).getTime()));
  if (keep) taken.delete(new Date(keep).getTime());
  return buildSlotDays(taken, now);
}
