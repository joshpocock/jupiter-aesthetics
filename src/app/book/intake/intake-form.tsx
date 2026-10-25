"use client";

import { useActionState } from "react";
import { saveIntake } from "./actions";
import { ActionForm } from "@/components/action-form";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/consent";
import { SPA_TIME_ZONE } from "@/lib/schedule";
import type { Intake, Profile } from "@/lib/types";

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card">
      <legend className="sr-only">{title}</legend>
      <h2 className="subheading">{title}</h2>
      {intro && <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-8 space-y-6">{children}</div>
    </fieldset>
  );
}

export function IntakeForm({
  profile,
  intake,
  next,
}: {
  profile: Profile;
  intake: Intake | null;
  next?: string;
}) {
  const [state, action, pending] = useActionState(saveIntake, undefined);
  const editing = next === "/account";
  const consented = intake?.consent_version === CONSENT_VERSION;

  // For an existing intake, send only what was changed; the server fills in the rest from the
  // latest saved record, so this save can't overwrite a newer edit made elsewhere.
  const loaded: Record<string, string> = {
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    date_of_birth: profile.date_of_birth ?? "",
    address: profile.address ?? "",
    medical_history: intake?.medical_history ?? "",
    current_medications: intake?.current_medications ?? "",
    allergies: intake?.allergies ?? "",
  };
  const submit = (formData: FormData) => {
    if (intake) {
      for (const [field, value] of Object.entries(loaded)) {
        if ((formData.get(field) ?? "") === value) formData.delete(field);
      }
      formData.set("_partial", "1");
    }
    action(formData);
  };

  return (
    <ActionForm action={submit} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}

      <Section title="Contact details">
        <div>
          <label htmlFor="full_name" className="label">Full name</label>
          <input id="full_name" name="full_name" required autoComplete="name" defaultValue={profile.full_name ?? ""} className="input" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">Mobile number</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" defaultValue={profile.phone ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="label">Date of birth</label>
            <input id="date_of_birth" name="date_of_birth" type="date" required autoComplete="bday" defaultValue={profile.date_of_birth ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" value={profile.email} readOnly disabled className="input" />
        </div>
        <div>
          <label htmlFor="address" className="label">
            Home address <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="address" name="address" autoComplete="street-address" defaultValue={profile.address ?? ""} className="input" />
        </div>
      </Section>

      <Section
        title="Your health"
        intro="Kept private and never shared with our payment provider. Write “None” where something doesn't apply."
      >
        <div>
          <label htmlFor="medical_history" className="label">Medical history</label>
          <textarea id="medical_history" name="medical_history" required rows={4} defaultValue={intake?.medical_history ?? ""} className="input" />
          <p className="hint">Conditions, surgeries, pregnancy or breastfeeding, and any previous aesthetic treatments.</p>
        </div>
        <div>
          <label htmlFor="current_medications" className="label">Current medications</label>
          <textarea id="current_medications" name="current_medications" required rows={3} defaultValue={intake?.current_medications ?? ""} className="input" />
          <p className="hint">Include supplements, blood thinners and anything applied to the skin.</p>
        </div>
        <div>
          <label htmlFor="allergies" className="label">Allergies</label>
          <textarea id="allergies" name="allergies" required rows={2} defaultValue={intake?.allergies ?? ""} className="input" />
        </div>
      </Section>

      <Section title="Consent">
        <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-line-strong bg-ivory p-5 transition-colors has-checked:border-clay has-checked:bg-blush/40">
          {/* Ticked when this client already agreed to the current wording; saving re-records it. */}
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={consented}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[var(--clay)]"
          />
          <span className="text-[0.9375rem] leading-relaxed">{CONSENT_TEXT}</span>
        </label>
        {consented && intake && (
          <p className="hint -mt-2">
            You agreed to this on{" "}
            {new Date(intake.consent_at).toLocaleDateString("en-US", { timeZone: SPA_TIME_ZONE, dateStyle: "long" })}.
          </p>
        )}
        <FormAlert state={state} />
        <SubmitButton className="btn-primary btn-lg w-full sm:w-auto" pending={pending} pendingText="Saving…">
          {editing ? "Save changes" : "Continue to choose a time"}
        </SubmitButton>
      </Section>
    </ActionForm>
  );
}
