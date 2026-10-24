"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Full-screen phone menu built on a native modal <dialog>: it sits in the top layer (so the
 * header's backdrop blur can't clip it) and gets focus trapping, Escape and focus return
 * from the browser.
 */
export function MobileMenu({
  links,
  signedIn,
  children,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
  children?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    // Lock page scroll while open; also close if the screen grows past the phone layout.
    const wide = window.matchMedia("(min-width: 40rem)");
    const onWide = () => wide.matches && el.close();
    const onClose = () => (document.documentElement.style.overflow = "");
    wide.addEventListener("change", onWide);
    el.addEventListener("close", onClose);
    return () => {
      wide.removeEventListener("change", onWide);
      el.removeEventListener("close", onClose);
      document.documentElement.style.overflow = "";
    };
  }, []);

  const item = "flex min-h-14 items-center border-b border-line font-serif text-2xl";

  return (
    <div className="sm:hidden">
      <div className="flex items-center gap-1">
        {!signedIn && (
          <Link href="/book" className="btn-primary min-h-11 px-5 text-sm max-[359px]:hidden">
            Book
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            dialog.current?.showModal();
            document.documentElement.style.overflow = "hidden";
          }}
          aria-haspopup="dialog"
          aria-label="Open menu"
          className="flex size-12 flex-col items-center justify-center gap-[7px] rounded-full hover:bg-linen"
        >
          <span className="h-px w-5 bg-ink" />
          <span className="h-px w-5 bg-ink" />
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-label="Menu"
        // Any link or the sign-out form closes the menu, even if the page doesn't change.
        onClick={(e) => (e.target as HTMLElement).closest("a") && close()}
        onSubmit={close}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-ivory p-0 text-ink backdrop:bg-ink/20"
      >
        <div className="flex h-16 items-center justify-between border-b border-line/70 px-5 pt-[env(safe-area-inset-top)]">
          <span className="font-serif text-[1.375rem] font-medium">
            Jupiter <span className="text-clay italic">Aesthetics</span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="relative flex size-12 items-center justify-center rounded-full hover:bg-linen"
          >
            <span className="absolute h-px w-5 rotate-45 bg-ink" />
            <span className="absolute h-px w-5 -rotate-45 bg-ink" />
          </button>
        </div>
        <nav aria-label="Main" className="flex flex-col px-5 pt-4">
          <Link href="/" className={item}>Home</Link>
          <Link href="/book" className={item}>Book a consultation</Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={item}>
              {l.label}
            </Link>
          ))}
          {children}
        </nav>
        <p className="mt-10 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-muted">
          Consultations Monday to Saturday, 9am to 5pm Eastern.
        </p>
      </dialog>
    </div>
  );
}
