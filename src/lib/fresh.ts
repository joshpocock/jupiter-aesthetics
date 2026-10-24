import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Call from a server action after it changes a client's data (intake, bookings, session).
 * Drops every page the browser is holding, so the next screen shows what's in the database.
 */
export function invalidateClientPages() {
  revalidatePath("/", "layout");
}
