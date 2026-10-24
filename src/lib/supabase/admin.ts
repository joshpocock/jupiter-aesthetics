import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Secret-key client that bypasses RLS. Server only: webhooks and payment confirmation. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
