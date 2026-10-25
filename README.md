# Jupiter Aesthetics booking

Free-consult booking for Jupiter Aesthetics: new-client intake, a Monday–Saturday calendar of 30-minute
slots, a $50 Stripe Checkout deposit, a client area to reschedule or cancel, and an owner view.

Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · Stripe Checkout (test mode).

## Setup

1. **Keys** live in `.env.local` (not committed): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.
2. **Database:** already applied to the `juniper-aesthetics` project (ref `hgntloxladlccunqabgv`). For a fresh
   project, paste `supabase/migrations/20261024000000_init.sql` into the SQL editor, or run
   `supabase db query --linked -f supabase/migrations/20261024000000_init.sql` after `supabase link`.
3. **Owner account:** sign up in the app, then run in the SQL editor:
   ```sql
   update public.profiles set role = 'owner' where email = 'owner@example.com';
   ```
4. **Supabase Auth URLs** (needed for password-reset links, and for email confirmation if you turn it on): add
   `http://localhost:3000/auth/callback` under Authentication → URL Configuration → Redirect URLs. Supabase's
   built-in email sender is heavily rate-limited and only delivers to your team's addresses; set up custom
   SMTP before real clients use password reset.
5. **Reset-password email template** (Authentication → Emails → Reset password): change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/password` so reset
   links also work when opened in a phone's mail app. The default link only works in the browser that asked.
6. **Contact details** (optional but recommended): set `NEXT_PUBLIC_CONTACT_PHONE` and/or
   `NEXT_PUBLIC_CONTACT_EMAIL` in `.env.local`. They're shown wherever a client is asked to get in touch
   (changes inside 24 hours, a payment that arrived after the hold ran out).

## Run locally

```bash
npm run dev
```

In a second terminal, forward Stripe test webhooks (the signing secret in `.env.local` comes from this CLI):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook --api-key <your sk_test key>
```

Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. The success page also
confirms payment directly with Stripe, so bookings confirm even if the webhook isn't running.

Check the database rules (double booking, RLS, payment functions) against your project:

```bash
node --env-file=.env.local scripts/verify-db.mjs
```

## Automated end-to-end tests

Give every scenario its own disposable account so scenarios can't cancel, move or pay each other's
bookings. Create one in the state the scenario needs, and
delete them all afterwards:

```bash
node --env-file=.env.local scripts/test-accounts.mjs create unpaid --base-url https://jupiter-aesthetics.vercel.app
node --env-file=.env.local scripts/test-accounts.mjs cleanup
```

States: `new`, `intake`, `unpaid` (with an open Checkout), `released`, `confirmed`, `owner`. Credentials
go to `.test-account.json` (git-ignored). Only `@example.test` addresses are ever created or deleted.
For full isolation, point the script and a preview deployment at a separate Supabase test project.

## How it works

- **Schedule** – `src/lib/schedule.ts` builds slots (America/New_York, 9:00–16:30 starts, Mon–Sat,
  2 hours to 56 days ahead). `public.is_bookable_slot` enforces the same rules in the database; change both together.
- **No double booking** – a unique index on `bookings.slot_start` for active bookings
  (`pending_payment`, `confirmed`). All writes go through security-definer functions; clients can't write
  `bookings` directly.
- **Deposit** – choosing a time always books a new consultation: a `pending_payment` booking held for
  35 minutes and a Checkout session that expires after 31. `checkout.session.completed` (or the success
  page) confirms it; `checkout.session.expired` or backing out of Checkout releases the slot. A client can
  have any number of upcoming bookings, each with its own deposit; holds don't release each other. A
  released unpaid hold offers "Resume payment", which re-takes the same time if it's still free.
- **Changes** – clients can reschedule or cancel up to 24 hours before. Cancelling does **not** refund the
  deposit automatically; the owner view shows "Paid, not attending" so the owner can refund in Stripe.
- **Privacy** – RLS limits clients to their own profile, intake and bookings; owners can read all. Intakes
  are written only through `public.save_intake`, which requires consent and stamps the consent time. No
  health data is sent to Stripe.

- **Extras** – clients can add a confirmed consultation to their calendar (`.ics` with a 24-hour reminder),
  reset or change their password, and owners can search bookings and download them as CSV (contact and
  booking details only, never health data).

## Brand

Warm ivory, linen and clay with an espresso ink colour; Cormorant Garamond for headings and Jost for text.
Tokens and shared classes (`btn-*`, `input`, `card`, `heading`, `planet`) live in `src/app/globals.css`.
Every button and input is at least 48px tall, and inputs use 16px text so phones don't zoom on focus.

## Before going live

- Turn on email confirmation and add rate limiting/CAPTCHA to sign-up: anyone can create many accounts
  and each can hold one slot for 35 minutes.
- Use live Stripe keys and a real webhook endpoint with its own signing secret.
- Health data: Supabase requires a signed BAA (Team plan or above) for HIPAA workloads.
