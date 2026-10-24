"use client";

import Link from "next/link";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center sm:py-32">
      <span className="planet mx-auto block size-20" aria-hidden />
      <p className="eyebrow mt-10">Something went wrong</p>
      <h1 className="heading mt-4">We couldn&apos;t load this page.</h1>
      <p className="lede mt-5">Please try again in a moment.</p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className="btn-primary btn-lg">Try again</button>
        <Link href="/" className="btn-secondary btn-lg">Back to home</Link>
      </div>
    </div>
  );
}
