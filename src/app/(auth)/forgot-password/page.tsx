import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { FormAlert } from "@/components/form-alert";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

async function Expired({ searchParams }: { searchParams: PageProps<"/forgot-password">["searchParams"] }) {
  const { expired } = await searchParams;
  if (!expired) return null;
  return (
    <div className="mb-6">
      <FormAlert state={{ error: "That reset link has expired or was already used. Request a new one below." }} />
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <AuthLayout
      eyebrow="Account"
      title="Reset your password"
      intro="Enter the email you booked with and we'll send you a link to choose a new password."
    >
      <Suspense>
        <Expired searchParams={searchParams} />
      </Suspense>
      <ForgotForm />
    </AuthLayout>
  );
}
