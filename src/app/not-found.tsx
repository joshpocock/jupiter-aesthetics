import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center sm:py-32">
      <span className="planet mx-auto block size-20" aria-hidden />
      <p className="eyebrow mt-10">Page not found</p>
      <h1 className="heading mt-4">This page has drifted off.</h1>
      <p className="lede mt-5">The link may be out of date, or the booking may no longer be available.</p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn-primary btn-lg">Back to home</Link>
        <Link href="/account" className="btn-secondary btn-lg">My bookings</Link>
      </div>
    </div>
  );
}
