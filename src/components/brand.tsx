import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 rounded-full ${className}`}
      aria-label="Jupiter Aesthetics, home"
    >
      <span className="planet size-7 shrink-0 transition-transform duration-500 group-hover:rotate-12" aria-hidden />
      <span className="font-serif text-[1.375rem] leading-none font-medium tracking-[0.01em] whitespace-nowrap">
        Jupiter <span className="text-clay italic">Aesthetics</span>
      </span>
    </Link>
  );
}

export function PageShell({
  children,
  width = "md",
}: {
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}) {
  const max = { sm: "max-w-lg", md: "max-w-2xl", lg: "max-w-3xl", xl: "max-w-6xl" }[width];
  return <div className={`mx-auto w-full ${max} px-5 pt-10 pb-24 sm:px-8 sm:pt-16 sm:pb-32`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="rise">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className={`heading ${eyebrow ? "mt-4" : ""}`}>{title}</h1>
      {children && <div className="lede mt-4 max-w-xl">{children}</div>}
    </header>
  );
}
