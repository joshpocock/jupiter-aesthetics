export type FormState = { error?: string; message?: string } | undefined;

export function FormAlert({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state?.error && (
        <p role="alert" className="rounded-2xl border border-rose/20 bg-rose/6 px-5 py-4 text-[0.9375rem] text-rose">
          {state.error}
        </p>
      )}
      {!state?.error && state?.message && (
        <p role="status" className="rounded-2xl border border-sage/20 bg-sage/8 px-5 py-4 text-[0.9375rem] text-sage">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rise rounded-2xl border border-sage/20 bg-sage/8 px-5 py-4 text-[0.9375rem] text-sage">
      {children}
    </p>
  );
}
