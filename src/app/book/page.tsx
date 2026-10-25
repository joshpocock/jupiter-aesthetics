import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Spinner } from "@/components/submit-button";

// Every booking starts with the intake: new clients fill it in, returning clients confirm their
// health details are still current and re-confirm consent before choosing a time.
async function Route(): Promise<never> {
  await requireUser("/book");
  redirect("/book/intake");
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center gap-3 px-5 py-32 text-muted">
          <Spinner /> Preparing your booking…
        </p>
      }
    >
      <Route />
    </Suspense>
  );
}
