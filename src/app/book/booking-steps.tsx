const STEPS = ["Your details", "Choose a time", "Deposit"];

export function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Booking progress" className="rise">
      <p className="text-sm text-muted sm:hidden">
        {current > 3 ? (
          <span className="text-ink">Booked</span>
        ) : (
          <>
            Step {current} of 3 · <span className="text-ink">{STEPS[current - 1]}</span>
          </>
        )}
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:mt-0 sm:gap-3">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const here = n === current;
          return (
            <li key={label} aria-current={here ? "step" : undefined}>
              <span
                className={`block h-1 rounded-full transition-colors ${done || here ? "bg-clay" : "bg-line"}`}
                aria-hidden
              />
              <span className={`mt-3 hidden text-sm sm:block ${here ? "text-ink" : "text-muted"}`}>
                <span className="font-serif text-base italic">0{n}</span> {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
