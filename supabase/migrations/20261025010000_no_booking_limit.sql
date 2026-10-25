-- Remove the three-upcoming-bookings limit added in 20261025000000.
--
-- Any fixed limit eventually blocks a long-lived account (an automated test account reused across
-- every run hit it), and each booking already costs a $50 deposit to confirm; unpaid holds still
-- lapse after 35 minutes. No double booking is unchanged (bookings_one_active_per_slot).

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
  -- One booking attempt per client at a time, so two tabs don't race.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  if not exists (select 1 from public.intakes where client_id = v_uid) then
    raise exception 'intake_required';
  end if;
  if not public.is_bookable_slot(p_slot) then
    raise exception 'slot_unavailable';
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

drop function if exists public.upcoming_booking_count(uuid);
