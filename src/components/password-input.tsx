"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        minLength={8}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        required
        className="input pr-20"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label="Show password"
        aria-controls={id}
        className="absolute inset-y-1 right-1 rounded-xl px-4 text-sm font-medium text-muted hover:bg-linen hover:text-ink"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
