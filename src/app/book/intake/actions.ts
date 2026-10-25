"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, safeNext } from "@/lib/auth";
import { CONSENT_VERSION } from "@/lib/consent";
import { invalidateClientPages } from "@/lib/fresh";
import type { FormState } from "@/components/form-alert";

const text = (label: string, max = 4000) =>
  z.string().trim().min(1, `${label} is required. Write "None" if it doesn't apply.`).max(max);

const intakeSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+().\-\s]{7,20}$/, "Enter a valid phone number."),
  date_of_birth: z.iso.date("Enter your date of birth.").refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / (365.25 * 86400_000);
    return age >= 18 && age < 120;
  }, "You must be 18 or older to book."),
  address: z.string().trim().max(300).optional(),
  medical_history: text("Medical history"),
  current_medications: text("Current medications"),
  allergies: text("Allergies"),
  consent: z.literal("on", { error: "Please tick the consent box to continue." }),
});

const FIELDS = [
  "full_name", "phone", "date_of_birth", "address",
  "medical_history", "current_medications", "allergies",
] as const;

export async function saveIntake(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireUser("/book/intake");
  const submitted = Object.fromEntries(formData) as Record<string, string>;

  // When editing, the form sends only the fields that were changed. Fill the rest from what's
  // saved *now*, so an edit to one section never overwrites a newer edit to another (from a
  // second tab, another device, or a parallel test on the same account).
  if (submitted._partial === "1") {
    const { data: current } = await supabase
      .from("intakes")
      .select("medical_history, current_medications, allergies")
      .eq("client_id", user.id)
      .maybeSingle();
    const saved: Record<string, string | null | undefined> = { ...profile, ...current };
    for (const field of FIELDS) {
      if (!(field in submitted)) submitted[field] = saved[field] ?? "";
    }
  }

  const parsed = intakeSchema.safeParse(submitted);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { full_name, phone, date_of_birth, address, medical_history, current_medications, allergies } =
    parsed.data;

  // The database stamps the consent time and enforces the required fields.
  const { error } = await supabase.rpc("save_intake", {
    p_full_name: full_name,
    p_phone: phone,
    p_date_of_birth: date_of_birth,
    p_address: address ?? null,
    p_medical_history: medical_history,
    p_current_medications: current_medications,
    p_allergies: allergies,
    p_consent: true,
    p_consent_version: CONSENT_VERSION,
  });
  if (error) return { error: "We couldn't save your intake form. Please try again." };

  invalidateClientPages();
  redirect(safeNext(formData.get("next"), "/book/schedule"));
}
