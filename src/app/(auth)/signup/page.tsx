import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create your account" };

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={typeof next === "string" ? next : undefined} />;
}

export default function Page({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthLayout
      eyebrow="New client"
      title={<>Let&apos;s get you <span className="italic">booked in</span></>}
      intro="Create an account so you can manage your appointment. A short intake form comes next."
    >
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}
