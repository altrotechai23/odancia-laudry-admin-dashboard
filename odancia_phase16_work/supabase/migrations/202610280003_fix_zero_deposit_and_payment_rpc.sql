-- Odancia Laundry hotfix: correct no-deposit balances and make payment RPC reliable.
-- Safe for existing data: only repairs services with no ledger transactions,
-- zero recorded paid amount, and zero deposit. Existing payment rows are untouched.

begin;

-- Services created without a deposit did not fire the payment-sync trigger, so the
-- table default left their balance at zero. Repair only genuinely unpaid, ledger-
-- empty services; retain older services with legacy amount_paid/deposit values.
update public.services s
   set deposit_amount = 0,
       amount_paid = 0,
       balance = greatest(coalesce(s.total_price, 0), 0),
       payment_status = case
         when coalesce(s.total_price, 0) <= 0 then 'paid'
         else 'unpaid'
       end
 where coalesce(s.amount_paid, 0) = 0
   and coalesce(s.deposit_amount, 0) = 0
   and not exists (
     select 1
       from public.payments p
      where p.service_id = s.id
   );

-- Initialize service/payment variables explicitly to support admin 0000 and staff
-- passcodes. The server must issue a short-lived staff_operation_authorizations
-- ticket first; raw passcodes are never sent to or stored in this function.
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

  select p.role::text
    into v_logged_in_role
    from public.profiles p
   where p.id = v_actor
     and p.is_active = true;

  if v_logged_in_role is null or v_logged_in_role not in ('owner', 'admin') then
    raise exception 'Active administrator profile required.' using errcode = '42501';
  end if;

  if p_service_id is null then
    raise exception 'Service ID is required.' using errcode = '22023';
  end if;

  if p_received_by is null or not exists (
    select 1
      from public.staff_operation_authorizations a
     where a.auth_user_id = v_actor
       and a.staff_id = p_received_by
       and a.expires_at > now()
  ) then
    raise exception 'Passcode authorization expired. Re-enter 0000 or the passcode of an active on-duty staff member.' using errcode = '42501';
  end if;

  select p.role::text
    into v_operator_role
    from public.profiles p
   where p.id = p_received_by
     and p.is_active = true;

  if v_operator_role in ('owner', 'admin') then
    if p_received_by <> v_actor then
      raise exception 'Admin payments must be attributed to the currently logged-in admin.' using errcode = '42501';
    end if;
  elsif v_operator_role = 'staff' then
    if not exists (
      select 1
        from public.staff_shifts sh
       where sh.staff_id = p_received_by
         and sh.checked_out_at is null
    ) then
      raise exception 'This staff member is not currently clocked in.' using errcode = '42501';
    end if;
  else
    raise exception 'Payment operator is not an active admin or staff member.' using errcode = '42501';
  end if;

  if p_amounts is null or p_methods is null
     or cardinality(p_amounts) < 1
     or cardinality(p_amounts) > 4
     or cardinality(p_amounts) <> cardinality(p_methods) then
    raise exception 'Add between one and four valid payment methods.' using errcode = '22023';
  end if;

  -- Lock the service while validating the amount to prevent concurrent payments
  -- from spending the same outstanding balance twice.
  select greatest(coalesce(s.total_price, 0), 0)::numeric(12,2)
    into v_total_price
    from public.services s
   where s.id = p_service_id
   for update;

  if not found then
    raise exception 'Service not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(p.amount), 0)::numeric(12,2)
    into v_amount_paid
    from public.payments p
   where p.service_id = p_service_id;

  v_balance := greatest(v_total_price - v_amount_paid, 0);

  for v_i in 1..cardinality(p_amounts) loop
    v_amount := round(p_amounts[v_i], 2);
    v_method := lower(trim(coalesce(p_methods[v_i], '')));

    if v_amount is null or v_amount <= 0 then
      raise exception 'Every payment amount must be greater than zero.' using errcode = '22023';
    end if;
    if v_method not in ('cash', 'eft', 'card', 'other') then
      raise exception 'Invalid payment method: %. Choose cash, eft, card or other.', v_method using errcode = '22023';
    end if;

    v_batch_total := v_batch_total + v_amount;
  end loop;

  v_batch_total := round(v_batch_total, 2);
  if v_batch_total > v_balance then
    raise exception 'Payment total of % exceeds outstanding balance of %.', v_batch_total, v_balance using errcode = '22023';
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
      case
        when v_i = cardinality(p_amounts) and v_batch_total >= v_balance then 'final'
        else 'partial'
      end,
      p_received_by
    );
  end loop;

  -- Payment triggers recalculate totals. Preserve the actual operator as updater.
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
  'Atomically records up to four payment transactions, enforcing a verified admin or on-duty staff actor and outstanding balance.';

notify pgrst, 'reload schema';

commit;

with checks(check_name, present) as (
  select 'no-deposit balances repaired', not exists (
    select 1
      from public.services s
     where coalesce(s.amount_paid, 0) = 0
       and coalesce(s.deposit_amount, 0) = 0
       and coalesce(s.balance, 0) <> greatest(coalesce(s.total_price, 0), 0)
       and not exists (select 1 from public.payments p where p.service_id = s.id)
  )
  union all
  select 'payment RPC signature',
         to_regprocedure('public.odancia_record_service_payments(uuid,numeric[],text[],uuid)') is not null
)
select check_name, case when present then 'OK' else 'CHECK' end as status
from checks
order by check_name;
