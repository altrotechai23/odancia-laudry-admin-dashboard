-- Odancia Laundry: simplified admin-only session and 4-digit staff service authorization.
-- Apply this COMPLETE file in Supabase SQL Editor. Do not run individual fragments.
-- This migration is additive to customer/service/payment data and is safe to rerun.

create extension if not exists pgcrypto;

-- Staff contact information is kept with the existing profiles table.
alter table public.profiles
  add column if not exists address text,
  add column if not exists contact_email text;

-- These columns may already exist from the express-service migration/fix.
alter table public.services
  add column if not exists base_price numeric(12,2),
  add column if not exists is_express boolean not null default false,
  add column if not exists express_earliest_at timestamptz,
  add column if not exists expected_completion_at timestamptz;

update public.services
   set base_price = total_price
 where base_price is null;

alter table public.services alter column base_price set default 0;

-- Private, keyed HMAC lookup. The raw four-digit passcode is never stored.
-- login_email remains for compatibility with the earlier staff-credential table;
-- it is not used for sign-in in the simplified workflow.
create table if not exists public.staff_passcode_credentials (
  staff_id uuid primary key references public.profiles(id) on delete cascade,
  login_email text not null unique,
  passcode_lookup_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  checked_out_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint staff_shifts_checkout_after_checkin
    check (checked_out_at is null or checked_out_at >= checked_in_at)
);

create unique index if not exists staff_shifts_one_open_shift_per_staff
  on public.staff_shifts(staff_id)
  where checked_out_at is null;
create index if not exists staff_shifts_staff_checked_in_idx
  on public.staff_shifts(staff_id, checked_in_at desc);

-- Each server action gets a distinct, short-lived ticket so concurrent admin
-- service operations cannot overwrite one another's authorized staff identity.
create table if not exists public.staff_operation_authorizations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references public.profiles(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists staff_operation_authorizations_recent_idx
  on public.staff_operation_authorizations(auth_user_id, expires_at desc);

-- Attempts store only a keyed, one-way hash of the request source; never the code.
create table if not exists public.staff_passcode_login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists staff_passcode_login_attempts_recent_idx
  on public.staff_passcode_login_attempts(ip_hash, attempted_at desc)
  where success = false;

alter table public.staff_shifts enable row level security;
alter table public.staff_passcode_credentials enable row level security;
alter table public.staff_operation_authorizations enable row level security;
alter table public.staff_passcode_login_attempts enable row level security;

-- An administrator may read the attendance table. All shift writes are made via
-- validated server actions using service_role and are attributed in shift fields.
drop policy if exists "staff_shifts_read_owner_admin_or_self" on public.staff_shifts;
drop policy if exists "staff_shifts_read_owner_admin" on public.staff_shifts;
create policy "staff_shifts_read_owner_admin"
  on public.staff_shifts for select to authenticated
  using (public.odancia_is_owner_or_admin());

drop policy if exists "staff_passcode_credentials_read_owner_admin" on public.staff_passcode_credentials;
create policy "staff_passcode_credentials_read_owner_admin"
  on public.staff_passcode_credentials for select to authenticated
  using (public.odancia_is_owner_or_admin());

revoke all on public.staff_passcode_credentials from anon, authenticated;
revoke all on public.staff_operation_authorizations from anon, authenticated;
revoke all on public.staff_passcode_login_attempts from anon, authenticated;
revoke insert, update, delete on public.staff_shifts from anon, authenticated;
grant select on public.staff_shifts to authenticated;
grant all on public.staff_shifts, public.staff_passcode_credentials,
  public.staff_operation_authorizations, public.staff_passcode_login_attempts to service_role;
grant usage, select on sequence public.staff_passcode_login_attempts_id_seq to service_role;

-- Retain this function name because existing policies reference it, but the
-- authorization now means a verified 4-digit staff code, not a barcode.
create or replace function public.odancia_has_recent_barcode_authorization()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.staff_operation_authorizations a
     where a.auth_user_id = auth.uid()
       and a.expires_at > now()
  );
$$;
revoke all on function public.odancia_has_recent_barcode_authorization() from public, anon;
grant execute on function public.odancia_has_recent_barcode_authorization() to authenticated;

-- Every direct write to services/payments needs a recent passcode ticket,
-- including writes made by an owner/admin account. Reads remain unchanged.
do $$
declare
  t text;
  cmd text;
  pol text;
begin
  foreach t in array array['services','payments'] loop
    foreach cmd in array array['INSERT','UPDATE','DELETE'] loop
      pol := 'odancia_barcode_gate_' || t || '_' || lower(cmd);
      execute format('drop policy if exists %I on public.%I', pol, t);
      if cmd = 'INSERT' then
        execute format(
          'create policy %I on public.%I as restrictive for insert to authenticated with check (public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      elsif cmd = 'UPDATE' then
        execute format(
          'create policy %I on public.%I as restrictive for update to authenticated using (public.odancia_has_recent_barcode_authorization()) with check (public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      else
        execute format(
          'create policy %I on public.%I as restrictive for delete to authenticated using (public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      end if;
    end loop;
  end loop;
end $$;

-- Payment batches remain atomic and are tied to the staff member whose code was
-- checked by the server. Existing payment triggers remain responsible for totals.
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
  v_staff_role text;
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

  select role::text into v_role
    from public.profiles
   where id = v_actor and is_active = true;

  if v_role not in ('owner', 'admin') or v_role is null then
    raise exception 'Active administrator profile required.' using errcode = '42501';
  end if;

  if p_received_by is null or not exists (
    select 1
      from public.staff_operation_authorizations a
     where a.auth_user_id = v_actor
       and a.staff_id = p_received_by
       and a.expires_at > now()
  ) then
    raise exception 'Enter the 4-digit passcode of an on-duty staff member to authorize this payment.' using errcode = '42501';
  end if;

  select role::text into v_staff_role
    from public.profiles
   where id = p_received_by and is_active = true;
  if v_staff_role is distinct from 'staff' then
    raise exception 'The payment operator must be an active staff member.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.staff_shifts
     where staff_id = p_received_by and checked_out_at is null
  ) then
    raise exception 'The selected staff member is not clocked in.' using errcode = '42501';
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

  -- The existing payment trigger recalculates service totals on each insert;
  -- this final update restores staff attribution within the same transaction.
  update public.services
     set updated_by = p_received_by,
         updated_at = now()
   where id = p_service_id;

  return jsonb_build_object(
    'success', true,
    'transactions', cardinality(p_amounts),
    'total_received', v_batch_total,
    'remaining_balance', greatest(v_balance - v_batch_total, 0),
    'received_by', p_received_by
  );
end;
$$;
revoke all on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) from public, anon;
grant execute on function public.odancia_record_service_payments(uuid, numeric[], text[], uuid) to authenticated;

-- Shift audit entries are attributed to the administrator who performed the
-- clock-in/out action, using checked_in_by / checked_out_by.
create or replace function public.odancia_audit_staff_shift_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_record_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
begin
  if tg_op = 'DELETE' then
    v_actor_id := coalesce(old.checked_out_by, old.checked_in_by, auth.uid());
    v_record_id := old.id;
    v_old_data := to_jsonb(old);
    v_new_data := null;
  else
    v_actor_id := coalesce(new.checked_out_by, new.checked_in_by, auth.uid());
    v_record_id := new.id;
    v_old_data := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    v_new_data := to_jsonb(new);
  end if;

  select full_name into v_actor_name from public.profiles where id = v_actor_id;
  insert into public.audit_logs (
    table_name, record_id, action, actor_id, actor_name, old_data, new_data, created_at
  ) values (
    'staff_shifts', v_record_id, tg_op, v_actor_id, v_actor_name, v_old_data, v_new_data, now()
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists odancia_staff_shifts_audit on public.staff_shifts;
create trigger odancia_staff_shifts_audit
after insert or update or delete on public.staff_shifts
for each row execute function public.odancia_audit_staff_shift_change();

comment on table public.staff_passcode_credentials is 'Private keyed HMAC lookup for four-digit staff service authorization; not an app login credential.';
comment on table public.staff_operation_authorizations is 'Private, short-lived authorization tickets tying a logged-in administrator and verified on-duty staff member to service writes.';
comment on table public.staff_shifts is 'Staff clock-in/out history. Administrators control shift changes from the dashboard.';

notify pgrst, 'reload schema';

with required_objects (item, present) as (
  select 'services.base_price', exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='base_price')
  union all select 'services.is_express', exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='is_express')
  union all select 'services.express_earliest_at', exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='express_earliest_at')
  union all select 'services.expected_completion_at', exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='expected_completion_at')
  union all select 'profiles.address', exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='address')
  union all select 'profiles.contact_email', exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='contact_email')
  union all select 'staff_shifts table', to_regclass('public.staff_shifts') is not null
  union all select 'staff_passcode_credentials table', to_regclass('public.staff_passcode_credentials') is not null
  union all select 'staff_operation_authorizations table', to_regclass('public.staff_operation_authorizations') is not null
  union all select 'staff_passcode_login_attempts table', to_regclass('public.staff_passcode_login_attempts') is not null
  union all select 'payment RPC', to_regprocedure('public.odancia_record_service_payments(uuid,numeric[],text[],uuid)') is not null
  union all select 'service write authorization function', to_regprocedure('public.odancia_has_recent_barcode_authorization()') is not null
)
select item, case when present then 'OK' else 'MISSING' end as status
from required_objects
order by item;
