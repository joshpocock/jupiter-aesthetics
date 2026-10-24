-- Clients can book more than one upcoming consultation, each with its own $50 deposit.
--
-- Before: one upcoming consultation per client, and starting a new booking released the
-- client's other unpaid holds. Now:
--   * up to 3 upcoming bookings per client (confirmed ahead, or unpaid and still held),
--     so one person can't take over the calendar;
--   * every unpaid hold keeps its full 35 minutes and its own Checkout;
--   * a late payment on a released hold is revived if its time is still free and ahead,
--     whatever else the client has booked.
-- No double booking is unchanged: the bookings_one_active_per_slot index still applies.

create or replace function public.upcoming_booking_count(p_client uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.bookings
  where client_id = p_client
    and slot_start > now()
    and (status = 'confirmed' or (status = 'pending_payment' and hold_expires_at > now()));
$$;

create or replace function public.create_pending_booking(p_slot timestamptz)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- One booking attempt per client at a time, so two tabs can't race past the limit.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  if not exists (select 1 from public.intakes where client_id = v_uid) then
    raise exception 'intake_required';
  end if;
  if not public.is_bookable_slot(p_slot) then
    raise exception 'slot_unavailable';
  end if;
  if public.upcoming_booking_count(v_uid) >= 3 then
    raise exception 'too_many_bookings';
  end if;

  -- Release a hold on this slot only if it has already run out.
  update public.bookings set status = 'expired'
  where status = 'pending_payment' and slot_start = p_slot and hold_expires_at <= now();

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

create or replace function public.confirm_booking_payment(p_booking uuid, p_session text, p_payment_intent text)
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

  -- A held booking becomes confirmed. A released one is revived if its time is still ahead;
  -- if someone else has taken the time, the unique index stops it and the deposit is kept on
  -- the expired booking for the owner to refund.
  v_confirm := v_booking.status = 'pending_payment'
    or (v_booking.status = 'expired' and v_booking.slot_start > now());

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

revoke execute on function public.upcoming_booking_count(uuid) from public, anon, authenticated;
