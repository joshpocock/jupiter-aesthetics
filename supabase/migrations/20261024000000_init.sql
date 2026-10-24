-- Jupiter Aesthetics: clients, intake, consult bookings and deposits.
-- Paste into the Supabase SQL editor and run once.
--
-- Schedule rules (keep in sync with src/lib/schedule.ts):
--   America/New_York, Monday-Saturday, 30-minute slots from 09:00 to 16:30 (last start),
--   bookable from 2 hours ahead up to 56 days out, cancel/reschedule up to 24 hours before.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'expired');
create type public.deposit_status as enum ('unpaid', 'paid', 'refunded');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  date_of_birth date,
  address text,
  role text not null default 'client' check (role in ('client', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intakes (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  medical_history text not null check (length(trim(medical_history)) > 0),
  current_medications text not null check (length(trim(current_medications)) > 0),
  allergies text not null check (length(trim(allergies)) > 0),
  consent_version text not null check (length(trim(consent_version)) > 0),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  slot_start timestamptz not null,
  status public.booking_status not null default 'pending_payment',
  deposit_status public.deposit_status not null default 'unpaid',
  deposit_amount_cents integer not null default 5000,
  hold_expires_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The double-booking guarantee: at most one active booking per slot.
create unique index bookings_one_active_per_slot
  on public.bookings (slot_start)
  where status in ('pending_payment', 'confirmed');

create index bookings_client_idx on public.bookings (client_id, slot_start);

create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at + new-user profile triggers
-- ---------------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger intakes_touch before update on public.intakes
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create function public.is_bookable_slot(p_slot timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select
    extract(second from p_slot) = 0
    and extract(minute from p_slot at time zone 'America/New_York') in (0, 30)
    and extract(isodow from p_slot at time zone 'America/New_York') between 1 and 6
    and (p_slot at time zone 'America/New_York')::time between time '09:00' and time '16:30'
    and p_slot >= now() + interval '2 hours'
    and p_slot < now() + interval '56 days';
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.intakes enable row level security;
alter table public.bookings enable row level security;
alter table public.stripe_events enable row level security;

create policy "profiles: read own or owner" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_owner()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Clients may only edit their contact fields, never role/email/id.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, date_of_birth, address) on public.profiles to authenticated;

-- Intakes are written only through public.save_intake, which stamps consent itself.
create policy "intakes: read own or owner" on public.intakes
  for select to authenticated using (client_id = (select auth.uid()) or (select public.is_owner()));

revoke insert, update, delete on public.intakes from anon, authenticated;

-- Bookings are read through RLS but only ever written through the functions below.
create policy "bookings: read own or owner" on public.bookings
  for select to authenticated using (client_id = (select auth.uid()) or (select public.is_owner()));

revoke insert, update, delete on public.bookings from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke truncate, references, trigger on public.profiles, public.intakes, public.bookings
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Intake (called by signed-in clients)
-- ---------------------------------------------------------------------------

create function public.save_intake(
  p_full_name text,
  p_phone text,
  p_date_of_birth date,
  p_address text,
  p_medical_history text,
  p_current_medications text,
  p_allergies text,
  p_consent boolean,
  p_consent_version text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_consent is not true then
    raise exception 'consent_required';
  end if;
  if length(trim(coalesce(p_full_name, ''))) = 0
     or length(trim(coalesce(p_phone, ''))) = 0
     or p_date_of_birth is null then
    raise exception 'contact_required';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      phone = trim(p_phone),
      date_of_birth = p_date_of_birth,
      address = nullif(trim(coalesce(p_address, '')), '')
  where id = v_uid;

  insert into public.intakes
    (client_id, medical_history, current_medications, allergies, consent_version, consent_at)
  values
    (v_uid, trim(p_medical_history), trim(p_current_medications), trim(p_allergies), p_consent_version, now())
  on conflict (client_id) do update
  set medical_history = excluded.medical_history,
      current_medications = excluded.current_medications,
      allergies = excluded.allergies,
      consent_version = excluded.consent_version,
      consent_at = excluded.consent_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Booking functions (called by signed-in clients)
-- ---------------------------------------------------------------------------

-- Taken slots in a range, without exposing whose they are.
create function public.taken_slots(p_from timestamptz, p_to timestamptz)
returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  select slot_start from public.bookings
  where slot_start >= p_from and slot_start < p_to
    and (status = 'confirmed' or (status = 'pending_payment' and hold_expires_at > now()));
$$;

-- Holds a slot for 35 minutes while the client pays. Stripe Checkout expires after 31.
create function public.create_pending_booking(p_slot timestamptz)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- One booking attempt per client at a time, so two tabs can't both get a hold.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  if not exists (select 1 from public.intakes where client_id = v_uid) then
    raise exception 'intake_required';
  end if;
  if not public.is_bookable_slot(p_slot) then
    raise exception 'slot_unavailable';
  end if;
  if exists (
    select 1 from public.bookings
    where client_id = v_uid and status = 'confirmed' and slot_start > now()
  ) then
    raise exception 'already_booked';
  end if;

  -- Release any hold on this slot that has run out, and this client's own unpaid holds.
  update public.bookings set status = 'expired'
  where status = 'pending_payment'
    and ((slot_start = p_slot and hold_expires_at <= now()) or client_id = v_uid);

  begin
    insert into public.bookings (client_id, slot_start, hold_expires_at)
    values (v_uid, p_slot, now() + interval '35 minutes')
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  return v_booking;
end;
$$;

create function public.reschedule_booking(p_booking uuid, p_slot timestamptz)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where id = p_booking and client_id = auth.uid()
  for update;

  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'not_confirmed';
  end if;
  if v_booking.slot_start < now() + interval '24 hours' then
    raise exception 'too_late_to_change';
  end if;
  if not public.is_bookable_slot(p_slot) then
    raise exception 'slot_unavailable';
  end if;

  update public.bookings set status = 'expired'
  where status = 'pending_payment' and slot_start = p_slot and hold_expires_at <= now();

  begin
    update public.bookings set slot_start = p_slot
    where id = p_booking
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  return v_booking;
end;
$$;

-- Unpaid holds can be dropped any time; confirmed bookings up to 24 hours before.
-- The deposit is not refunded automatically: the owner sees "paid" on a cancelled booking.
create function public.cancel_booking(p_booking uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where id = p_booking and client_id = auth.uid()
  for update;

  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.status not in ('pending_payment', 'confirmed') then
    raise exception 'not_active';
  end if;
  if v_booking.status = 'confirmed' and v_booking.slot_start < now() + interval '24 hours' then
    raise exception 'too_late_to_change';
  end if;

  update public.bookings set status = 'cancelled', cancelled_at = now()
  where id = p_booking
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment functions (server only, called with the secret key)
-- ---------------------------------------------------------------------------

create function public.attach_checkout_session(p_booking uuid, p_session text)
returns void
language sql security definer set search_path = '' as $$
  update public.bookings set stripe_checkout_session_id = p_session
  where id = p_booking and status = 'pending_payment';
$$;

-- Idempotent. A held booking becomes confirmed. A lapsed hold is only revived if the slot is
-- still ahead and the client has no other upcoming booking; otherwise, or if the slot went to
-- someone else, the deposit is recorded as paid on the expired booking so the owner can refund it.
create function public.confirm_booking_payment(p_booking uuid, p_session text, p_payment_intent text)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings;
  v_confirm boolean;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.deposit_status = 'paid' then
    return v_booking;
  end if;

  v_confirm := v_booking.status = 'pending_payment'
    or (
      v_booking.status = 'expired'
      and v_booking.slot_start > now()
      and not exists (
        select 1 from public.bookings
        where client_id = v_booking.client_id and status = 'confirmed' and slot_start > now()
      )
    );

  begin
    update public.bookings
    set deposit_status = 'paid',
        paid_at = now(),
        stripe_checkout_session_id = p_session,
        stripe_payment_intent_id = p_payment_intent,
        status = case when v_confirm then 'confirmed'::public.booking_status else status end,
        hold_expires_at = null
    where id = p_booking
    returning * into v_booking;
  exception when unique_violation then
    update public.bookings
    set deposit_status = 'paid',
        paid_at = now(),
        stripe_checkout_session_id = p_session,
        stripe_payment_intent_id = p_payment_intent
    where id = p_booking
    returning * into v_booking;
  end;

  return v_booking;
end;
$$;

create function public.expire_checkout(p_session text)
returns void
language sql security definer set search_path = '' as $$
  update public.bookings set status = 'expired'
  where stripe_checkout_session_id = p_session and status = 'pending_payment';
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_bookable_slot(timestamptz) to authenticated;
grant execute on function public.taken_slots(timestamptz, timestamptz) to authenticated;
grant execute on function public.save_intake(text, text, date, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.create_pending_booking(timestamptz) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

grant execute on function public.attach_checkout_session(uuid, text) to service_role;
grant execute on function public.confirm_booking_payment(uuid, text, text) to service_role;
grant execute on function public.expire_checkout(text) to service_role;
