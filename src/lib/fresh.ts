import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Call from a server action after it changes a client's data (intake, bookings, session).
 * Drops every page the browser is holding, so the next screen shows what's in the database.
 */
export function invalidateClientPages() {
  revalidatePath("/", "layout");
}

/**
 * A new value on every server render. Use as a form's key so each visit remounts it with what's
 * saved: Next keeps visited pages mounted, and uncontrolled inputs would otherwise keep whatever
 * was typed (and not saved) the last time.
 */
export function renderKey() {
  return crypto.randomUUID();
}
