-- Odancia Laundry: admin master passcode and payment attribution.
-- Prerequisite: apply 202610280001_admin_session_staff_passcodes.sql first.
-- This migration replaces only the payment RPC; it does not delete or rewrite
-- service, customer, payment, profile, or audit history.

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
  v_logged_in_role text;
  v_operator_role text;
  v_total_price numeric(12,2);
  v_amount_paid numeric(12,2);
  v_balance numeric(12,2);
  v_batch_total numeric(12,2) := 0;
  v_method text;
  v_amount numeric(12,2);
  v_i integer;
begin
  if v_actor is null then
    raise exception 'Administrator session required.' using errcode = '42501';
  end if;

  select role::text into v_logged_in_role
    from public.profiles
   where id = v_actor and is_active = true;

  if v_logged_in_role not in ('owner', 'admin') or v_logged_in_role is null then
    raise exception 'Active administrator profile required.' using errcode = '42501';
  end if;

  -- The actor must have successfully verified either their own admin 0000 code
  -- or an active, on-duty staff member's unique code in this current session.
  if p_received_by is null or not exists (
    select 1
      from public.staff_operation_authorizations a
     where a.auth_user_id = v_actor
       and a.staff_id = p_received_by
       and a.expires_at > now()
  ) then
    raise exception 'Enter admin code 0000 or the passcode of an active on-duty staff member.' using errcode = '42501';
  end if;

  select role::text into v_operator_role
    from public.profiles
   where id = p_received_by and is_active = true;

  if v_operator_role in ('owner', 'admin') then
    -- Admin master-code actions can only be attributed to the same admin who
    -- owns this authenticated session; the code cannot impersonate another admin.
    if p_received_by <> v_actor then
      raise exception 'Admin actions must be attributed to the currently logged-in administrator.' using errcode = '42501';
    end if;
  elsif v_operator_role = 'staff' then
    if not exists (
      select 1 from public.staff_shifts
       where staff_id = p_received_by and checked_out_at is null
    ) then
      raise exception 'The selected staff member is not clocked in.' using errcode = '42501';
    end if;
  else
    raise exception 'The payment operator must be an active staff member or the logged-in administrator.' using errcode = '42501';
  end if;

  if p_service_id is null or p_amounts is null or p_methods is null
     or cardinality(p_amounts) < 1 or cardinality(p_amounts) > 4
     or cardinality(p_amounts) <> cardinality(p_methods) then
    raise exception 'Invalid payment batch.' using errcode = '22023';
  end if;

  select total_price into v_total_price
    from public.services where id = p_service_id for update;
  if not found then
    raise exception 'Service not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2) into v_amount_paid
    from public.payments where service_id = p_service_id;
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
    insert into public.payments (service_id, amount, payment_method, payment_stage, received_by)
    values (
      p_service_id,
      v_amount,
      v_method,
      case when v_i = cardinality(p_amounts) and v_batch_total >= v_balance then 'final' else 'partial' end,
      p_received_by
    );
  end loop;

  -- Existing payment triggers recalculate service totals. Reapply the verified
  -- operator identity afterward so trigger side effects cannot misattribute it.
  update public.services
     set updated_by = p_received_by,
         updated_at = now()
   where id = p_service_id;

  return jsonb_build_object(
    'success', true,
    'transactions', cardinality(p_amounts),
    'total_received', v_batch_total,
    'remaining_balance', greatest(v_balance - v_batch_total, 0),
    'received_by', p_received_by,
    'operator_role', v_operator_role
  );
end;
$$;

revoke all on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) from public, anon;
grant execute on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) to authenticated;

comment on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) is
  'Records an atomic payment batch attributed to the authenticated admin entered with 0000 or the verified active staff member on duty.';

notify pgrst, 'reload schema';

with checks (check_name, present) as (
  select 'staff_operation_authorizations table', to_regclass('public.staff_operation_authorizations') is not null
  union all
  select 'staff_shifts table', to_regclass('public.staff_shifts') is not null
  union all
  select 'staff_passcode_credentials table', to_regclass('public.staff_passcode_credentials') is not null
  union all
  select 'payment RPC supports admin actor attribution', to_regprocedure('public.odancia_record_service_payments(uuid,numeric[],text[],uuid)') is not null
  union all
  select 'service write authorization function', to_regprocedure('public.odancia_has_recent_barcode_authorization()') is not null
)
select check_name, case when present then 'OK' else 'MISSING' end as status
from checks
order by check_name;
