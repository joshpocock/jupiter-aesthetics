import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Choose a new password" };

async function Gate() {
  await requireUser("/account/password");
  return <PasswordForm />;
}

export default function Page() {
  return (
    <AuthLayout eyebrow="Account" title="Choose a new password" intro="Use at least 8 characters.">
      <Suspense fallback={<div className="h-72" />}>
        <Gate />
      </Suspense>
    </AuthLayout>
  );
}
