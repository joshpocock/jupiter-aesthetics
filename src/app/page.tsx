import Link from "next/link";

const STEPS = [
  {
    title: "Share a little about you",
    body: "A short, private intake covering your health history, medications and allergies, so we arrive prepared.",
  },
  {
    title: "Choose a time that suits",
    body: "Thirty unhurried minutes, Monday to Saturday between 9am and 5pm Eastern.",
  },
  {
    title: "Secure it with $50",
    body: "A deposit holds your appointment. Pay securely through Stripe; reschedule online up to a day before.",
  },
];

const COVERS = [
  "What you'd like to change, and what you'd rather keep",
  "Your health history and anything that affects treatment",
  "The options that genuinely suit you, and the ones that don't",
  "Your next steps, whenever you're ready",
];

const FAQ = [
  {
    q: "Is the consultation really complimentary?",
    a: "Yes. The consultation itself is free. We ask for a $50 deposit when you book to hold your time, because each appointment is reserved just for you.",
  },
  {
    q: "Can I change or cancel my appointment?",
    a: "Yes. Sign in to your account to move or cancel your booking online, up to 24 hours before. Within 24 hours, please get in touch with the clinic. Deposits aren't refunded automatically when you cancel.",
  },
  {
    q: "Who sees my health information?",
    a: "Your intake is stored privately for Jupiter Aesthetics and is never shared with our payment provider.",
  },
  {
    q: "What should I prepare?",
    a: "Nothing more than your intake form. If you take any medications or supplements, it helps to have their names to hand.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="planet pointer-events-none absolute -top-24 -right-40 size-[26rem] opacity-25 md:hidden"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28 md:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div className="rise">
            <p className="eyebrow">Complimentary consultation</p>
            <h1 className="display mt-6">
              Beauty, <span className="text-clay italic">considered</span>.
            </h1>
            <p className="lede mt-7 max-w-lg">
              Your time with Jupiter Aesthetics begins with a quiet, honest conversation about you: your goals,
              your health and what will look most like you.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="btn-primary btn-lg">
                Book your consultation
              </Link>
              <Link href="/account" className="btn-secondary btn-lg">
                Manage a booking
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li>30 minutes</li>
              <li aria-hidden className="hidden sm:list-item">·</li>
              <li>Monday to Saturday</li>
              <li aria-hidden className="hidden sm:list-item">·</li>
              <li>$50 deposit to reserve</li>
            </ul>
          </div>

          <div className="relative hidden aspect-square md:block" aria-hidden>
            <div className="absolute inset-[6%] rounded-full border border-line" />
            <div className="absolute inset-[16%] rounded-full border border-line/70" />
            <div className="planet absolute inset-[24%]" />
            <div className="absolute top-[18%] right-[6%] size-3 rounded-full bg-clay/50" />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-linen/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-xl">
            <p className="eyebrow">How it works</p>
            <h2 className="heading mt-4">From first click to <span className="italic">your consultation</span>.</h2>
          </div>
          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-line-strong pt-6">
                <p className="font-serif text-4xl text-clay italic">0{i + 1}</p>
                <h3 className="subheading mt-4">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-24">
        <div>
          <p className="eyebrow">Your consultation</p>
          <h2 className="heading mt-4">
            Unhurried, honest and <span className="italic">entirely about you</span>.
          </h2>
          <p className="lede mt-6">
            Thirty minutes set aside for your questions, so you leave with a clear understanding of your options
            and the time to decide.
          </p>
        </div>
        <ul className="divide-y divide-line self-end border-y border-line">
          {COVERS.map((c) => (
            <li key={c} className="flex gap-5 py-5">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-clay" aria-hidden />
              <span className="text-[1.0625rem] leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="eyebrow">Questions</p>
          <h2 className="heading mt-4">Before you <span className="italic">book</span>.</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="relative size-5 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-px before:w-5 before:bg-clay after:absolute after:top-0 after:left-1/2 after:h-5 after:w-px after:bg-clay after:transition-transform group-open:after:scale-y-0"
                    aria-hidden
                  />
                </summary>
                <p className="pb-6 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-ivory sm:px-12 sm:py-24">
          <div className="planet absolute -bottom-40 -left-32 size-80 opacity-30" aria-hidden />
          <div className="planet absolute -top-24 -right-20 size-56 opacity-20" aria-hidden />
          <div className="relative">
            <h2 className="heading mx-auto max-w-2xl">Begin with a conversation.</h2>
            <p className="mx-auto mt-5 max-w-md text-[1.0625rem] leading-relaxed text-ivory/70">
              Choose a time that suits you. Booking takes just a few minutes.
            </p>
            <Link
              href="/book"
              className="btn btn-lg mt-10 bg-ivory text-ink hover:bg-blush"
            >
              Book your consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
