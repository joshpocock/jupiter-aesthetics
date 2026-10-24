import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Wordmark } from "@/components/brand";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Jupiter Aesthetics · Complimentary consultations", template: "%s · Jupiter Aesthetics" },
  description:
    "Book a complimentary 30-minute consultation at Jupiter Aesthetics. Monday to Saturday, 9am to 5pm.",
};

export const viewport: Viewport = {
  themeColor: "#f8f3ed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${jost.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-ink px-5 py-3 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-20 sm:px-8">
            <Wordmark />
            <Suspense fallback={<div className="h-12 w-28" />}>
              <SiteNav />
            </Suspense>
          </div>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-line bg-linen/60 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3 sm:px-8">
            <div className="space-y-4">
              <Wordmark />
              <p className="max-w-xs text-sm leading-relaxed text-muted">
                Considered, natural-looking aesthetic care that begins with a conversation.
              </p>
            </div>
            <div>
              <p className="eyebrow">Consultation hours</p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-6 sm:block">
                  <dt className="text-muted">Monday – Saturday</dt>
                  <dd>9:00am – 5:00pm ET</dd>
                </div>
                <div className="flex justify-between gap-6 sm:block">
                  <dt className="text-muted">Sunday</dt>
                  <dd>Closed</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="eyebrow">Your visit</p>
              <ul className="mt-4 space-y-1 text-sm">
                <li>
                  <Link href="/book" className="inline-flex min-h-11 items-center hover:text-clay">
                    Book a consultation
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="inline-flex min-h-11 items-center hover:text-clay">
                    Manage my booking
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="inline-flex min-h-11 items-center hover:text-clay">
                    Questions
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
