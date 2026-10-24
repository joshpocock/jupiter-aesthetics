/** Centered card layout for sign-in, sign-up and password pages. */
export function AuthLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="planet pointer-events-none absolute -top-40 -right-48 size-[28rem] opacity-15" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-5 pt-12 pb-24 sm:pt-20 sm:pb-32">
        <div className="rise text-center">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="heading mt-4">{title}</h1>
          <p className="lede mx-auto mt-4 max-w-sm">{intro}</p>
        </div>
        <div className="card rise mt-10 [animation-delay:80ms]">{children}</div>
      </div>
    </div>
  );
}
