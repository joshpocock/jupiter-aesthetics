import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in" intro="View, move or cancel your consultation.">
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}
