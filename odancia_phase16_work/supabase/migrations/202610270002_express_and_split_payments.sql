-- Phase 2: express service metadata and atomic split-payment recording.
-- Apply to staging first. This does not delete or rewrite payment history.

alter table public.services
  add column if not exists base_price numeric(12,2),
  add column if not exists is_express boolean not null default false,
  add column if not exists express_earliest_at timestamptz,
  add column if not exists expected_completion_at timestamptz;

-- Preserve historical agreed prices for existing services.
update public.services
set base_price = total_price
where base_price is null;

alter table public.services
  alter column base_price set default 0;

comment on column public.services.base_price is
  'Agreed standard price before any express-service multiplier.';
comment on column public.services.is_express is
  'True when the service has the express 2–4 hour turnaround.';
comment on column public.services.express_earliest_at is
  'Earliest target completion time for express service (created time + 2 hours).';
comment on column public.services.expected_completion_at is
  'Latest target completion time for express service (created time + 4 hours).';

create or replace function public.odancia_record_service_payments(
  p_service_id uuid,
  p_amounts numeric[],
  p_methods text[],
  p_received_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_total_price numeric(12,2);
  v_amount_paid numeric(12,2);
  v_balance numeric(12,2);
  v_batch_total numeric(12,2) := 0;
  v_method text;
  v_amount numeric(12,2);
  v_i integer;
begin
  if v_actor is null or p_received_by is distinct from v_actor then
    raise exception 'Authenticated receiver is required.' using errcode = '42501';
  end if;

  select role::text
    into v_role
    from public.profiles
   where id = v_actor and is_active = true;

  if v_role not in ('owner', 'admin', 'staff') or v_role is null then
    raise exception 'Active staff profile required.' using errcode = '42501';
  end if;

  if p_service_id is null
     or p_amounts is null
     or p_methods is null
     or cardinality(p_amounts) < 1
     or cardinality(p_amounts) > 4
     or cardinality(p_amounts) <> cardinality(p_methods) then
    raise exception 'Invalid payment batch.' using errcode = '22023';
  end if;

  -- Lock the service row so concurrent payments cannot both spend the same balance.
  select total_price
    into v_total_price
    from public.services
   where id = p_service_id
   for update;

  if not found then
    raise exception 'Service not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2)
    into v_amount_paid
    from public.payments
   where service_id = p_service_id;

  v_balance := greatest(v_total_price - v_amount_paid, 0);

  for v_i in 1..cardinality(p_amounts) loop
    v_amount := round(p_amounts[v_i], 2);
    v_method := lower(trim(p_methods[v_i]));

    if v_amount is null or v_amount <= 0 then
      raise exception 'Every payment amount must be greater than zero.' using errcode = '22023';
    end if;
    if v_method not in ('cash', 'eft', 'card', 'other') then
      raise exception 'Invalid payment method.' using errcode = '22023';
    end if;
    v_batch_total := v_batch_total + v_amount;
  end loop;

  v_batch_total := round(v_batch_total, 2);
  if v_batch_total > v_balance then
    raise exception 'Payment batch exceeds outstanding balance.' using errcode = '22023';
  end if;

  for v_i in 1..cardinality(p_amounts) loop
    v_amount := round(p_amounts[v_i], 2);
    v_method := lower(trim(p_methods[v_i]));
    insert into public.payments (
      service_id,
      amount,
      payment_method,
      payment_stage,
      received_by
    ) values (
      p_service_id,
      v_amount,
      v_method,
      case when v_i = cardinality(p_amounts) and v_batch_total >= v_balance then 'final' else 'partial' end,
      v_actor
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'transactions', cardinality(p_amounts),
    'total_received', v_batch_total,
    'remaining_balance', greatest(v_balance - v_batch_total, 0)
  );
end;
$$;

revoke all on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) from public, anon;
grant execute on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) to authenticated;

comment on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) is
  'Atomically records a batch of up to four payment transactions after validating the active authenticated profile and outstanding balance.';
