"use client";

import { useActionState, useState } from "react";
import { FormAlert, type FormState } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";
import { formatDay, formatSlot, formatTime, SPA_TIME_ZONE, type SlotDay } from "@/lib/schedule";

const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: SPA_TIME_ZONE, hour: "numeric", hourCycle: "h23" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

function monthOf(date: string) {
  const [y, m] = date.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(y, m - 1, 1)));
}

export function SlotPicker({
  days,
  action,
  submitLabel,
  current,
  hidden,
  note,
}: {
  days: SlotDay[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  current?: string;
  hidden?: Record<string, string>;
  note?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const firstOpen = days.find((d) => d.slots.some((s) => s.available && s.iso !== current))?.date ?? days[0]?.date;
  const [day, setDay] = useState(firstOpen);
  const [pickedSlot, setSlot] = useState<string | null>(null);
  // The picker stays mounted when availability refreshes (so an error message stays visible);
  // a picked time only counts while it is still open in the latest list.
  const slot =
    pickedSlot &&
    days.some((d) => d.slots.some((s) => s.iso === pickedSlot && s.available && s.iso !== current))
      ? pickedSlot
      : null;
  const selectedDay = days.find((d) => d.date === day) ?? days.find((d) => d.date === firstOpen);

  if (days.length === 0) {
    return (
      <div className="card text-center">
        <p className="subheading">No times are open right now.</p>
        <p className="mt-3 text-muted">Please check back soon; new times open every day.</p>
      </div>
    );
  }

  const groups = selectedDay
    ? [
        { label: "Morning", slots: selectedDay.slots.filter((s) => Number(hourFormatter.format(new Date(s.iso))) < 12) },
        { label: "Afternoon", slots: selectedDay.slots.filter((s) => Number(hourFormatter.format(new Date(s.iso))) >= 12) },
      ].filter((g) => g.slots.length > 0)
    : [];

  return (
    <form action={formAction} className="card px-0 pb-0 sm:px-0 sm:pb-0">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="slot" value={slot ?? ""} />

      {/* min-w-0: fieldsets default to min-width: min-content, which would stretch the card. */}
      <fieldset className="min-w-0">
        <legend className="flex w-full items-baseline justify-between gap-4 px-6 sm:px-10">
          <span className="subheading">Choose a day</span>
          <span className="text-sm text-muted">{day && monthOf(day)}</span>
        </legend>
        <div className="relative mt-5">
          <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-6 gap-2.5 overflow-x-auto px-6 pb-2 sm:scroll-px-10 sm:px-10">
            {days.map((d, i) => {
              const newMonth = i === 0 || d.date.slice(0, 7) !== days[i - 1].date.slice(0, 7);
              const open = d.slots.filter((s) => s.available && s.iso !== current).length;
              const active = d.date === day;
              const [weekday, date] = formatDay(d.date).split(", ");
              return (
                <div key={d.date} className="flex w-[4.75rem] shrink-0 snap-start flex-col">
                  {/* Month marker above the first day and wherever a new month starts; same height either way. */}
                  <span className="mb-1.5 h-4 pl-1 text-[0.6875rem] leading-4 font-medium tracking-[0.16em] text-clay uppercase" aria-hidden>
                    {newMonth ? date.split(" ")[0] : ""}
                  </span>
                  <button
                    type="button"
                    disabled={open === 0}
                    onClick={() => {
                      setDay(d.date);
                      setSlot(null);
                    }}
                    aria-pressed={active}
                    aria-label={`${formatDay(d.date, "long")}, ${open === 0 ? "fully booked" : `${open} times available`}`}
                    className={`flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? "border-ink bg-ink text-ivory"
                        : "border-line-strong bg-shell hover:border-ink"
                    }`}
                  >
                    <span className={`text-[0.6875rem] tracking-[0.16em] uppercase ${active ? "text-ivory/70" : "text-muted"}`}>
                      {weekday}
                    </span>
                    <span className="mt-1 font-serif text-2xl leading-none">{date.split(" ")[1]}</span>
                    <span className={`mt-1.5 text-[0.6875rem] ${active ? "text-ivory/70" : "text-muted"}`}>
                      {open === 0 ? "Full" : `${open} open`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-shell sm:w-14" aria-hidden />
        </div>
      </fieldset>

      {selectedDay && (
        <fieldset className="mt-10 px-6 sm:px-10">
          <legend className="subheading">
            {formatDay(selectedDay.date, "long")}
            <span className="ml-2 font-sans text-sm font-normal text-muted">Eastern time</span>
          </legend>
          <div className="mt-6 space-y-7">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="eyebrow text-muted">{g.label}</p>
                <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {g.slots.map((s) => {
                    const isCurrent = s.iso === current;
                    const active = s.iso === slot;
                    const free = s.available && !isCurrent;
                    return (
                      <button
                        key={s.iso}
                        type="button"
                        disabled={!free}
                        onClick={() => setSlot(s.iso)}
                        aria-pressed={active}
                        className={`min-h-13 rounded-2xl border text-[0.9375rem] transition-colors disabled:cursor-not-allowed ${
                          active
                            ? "border-clay bg-clay text-shell shadow-[0_10px_24px_-14px_rgb(166_93_63/0.9)]"
                            : free
                              ? "border-line-strong bg-shell hover:border-clay hover:text-clay"
                              : "border-transparent bg-linen text-muted line-through decoration-muted/40"
                        }`}
                      >
                        {formatTime(s.iso)}
                        {isCurrent && <span className="block text-[0.6875rem]">Current</span>}
                        {!s.available && !isCurrent && <span className="sr-only"> (taken)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {/* Sticks to the bottom of the screen while scrolling through times on a phone. */}
      <div className="sticky bottom-0 mt-8 rounded-b-[1.75rem] border-t border-line bg-shell/95 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:px-10 sm:py-6">
        {state?.error && (
          <div className="mb-4">
            <FormAlert state={state} />
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-[0.9375rem] text-muted" aria-live="polite">
            {slot ? (
              <span className="text-ink">{formatSlot(slot)}</span>
            ) : (
              (note ?? "Select a time to continue.")
            )}
          </p>
          <SubmitButton className="btn-primary btn-lg w-full sm:w-auto" disabled={!slot} pendingText="One moment…">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
