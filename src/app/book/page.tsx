import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Spinner } from "@/components/submit-button";

async function Route(): Promise<never> {
  const { supabase, user } = await requireUser("/book");
  const { data: intake } = await supabase
    .from("intakes")
    .select("client_id")
    .eq("client_id", user.id)
    .maybeSingle();
  redirect(intake ? "/book/schedule" : "/book/intake");
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
