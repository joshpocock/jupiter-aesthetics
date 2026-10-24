// Consult schedule. The database enforces the same rules in public.is_bookable_slot,
// so change both together (supabase/migrations).
export const SPA_TIME_ZONE = "America/New_York";
export const SLOT_MINUTES = 30;
export const FIRST_SLOT = { hour: 9, minute: 0 };
export const LAST_SLOT = { hour: 16, minute: 30 };
export const OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Monday-Saturday (0 = Sunday)
export const MIN_LEAD_HOURS = 2;
export const HORIZON_DAYS = 56;
export const CHANGE_CUTOFF_HOURS = 24;
export const DEPOSIT_CENTS = 5000;

type LocalDate = { year: number; month: number; day: number };

export type SlotDay = {
  date: string; // YYYY-MM-DD in the spa's time zone
  slots: { iso: string; available: boolean }[];
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SPA_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(date: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function offsetMs(date: Date) {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in the spa's time zone to an absolute Date. */
export function zonedTime(d: LocalDate, hour: number, minute: number): Date {
  const guess = Date.UTC(d.year, d.month - 1, d.day, hour, minute);
  const first = guess - offsetMs(new Date(guess));
  // Re-check once in case the guess and the answer straddle a DST change.
  return new Date(guess - offsetMs(new Date(first)));
}

function addDays(d: LocalDate, days: number): LocalDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function dateKey(d: LocalDate) {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/** Every slot from today through the booking horizon, grouped by open day. */
export function buildSlotDays(taken: Set<number>, now = new Date()): SlotDay[] {
  const today = zonedParts(now);
  const earliest = now.getTime() + MIN_LEAD_HOURS * 3600_000;
  const latest = now.getTime() + HORIZON_DAYS * 86400_000;
  const days: SlotDay[] = [];

  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const d = addDays(today, i);
    const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
    if (!OPEN_WEEKDAYS.includes(weekday)) continue;

    const slots: SlotDay["slots"] = [];
    const first = FIRST_SLOT.hour * 60 + FIRST_SLOT.minute;
    const last = LAST_SLOT.hour * 60 + LAST_SLOT.minute;
    for (let m = first; m <= last; m += SLOT_MINUTES) {
      const start = zonedTime(d, Math.floor(m / 60), m % 60);
      const t = start.getTime();
      if (t < earliest || t >= latest) continue;
      slots.push({ iso: start.toISOString(), available: !taken.has(t) });
    }
    if (slots.length > 0) days.push({ date: dateKey(d), slots });
  }
  return days;
}

/** Changes whenever availability does, so a kept-mounted picker resets instead of showing stale picks. */
export function slotDaysKey(days: SlotDay[]) {
  return days.map((d) => `${d.date}:${d.slots.filter((s) => s.available).length}`).join("|");
}

export function canChange(slotStart: string | Date, now = new Date()) {
  return new Date(slotStart).getTime() - now.getTime() >= CHANGE_CUTOFF_HOURS * 3600_000;
}

export function formatSlot(iso: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SPA_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SPA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDay(date: string, style: "short" | "long" = "short") {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style,
    month: style === "short" ? "short" : "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
