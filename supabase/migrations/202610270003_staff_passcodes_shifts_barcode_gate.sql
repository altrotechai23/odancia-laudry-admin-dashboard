-- Phase 3: passcode-only staff sign-in, shift tracking and barcode write gate.
-- This migration is additive/idempotent. It does not delete or rewrite existing business rows.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists address text,
  add column if not exists contact_email text;

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

create table if not exists public.staff_barcode_credentials (
  staff_id uuid primary key references public.profiles(id) on delete cascade,
  barcode_hash text not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);
alter table public.staff_barcode_credentials
  add column if not exists rotated_at timestamptz;

-- This table is deliberately inaccessible to normal authenticated clients. A server
-- action writes a short-lived row only after validating the staff barcode and shift.
create table if not exists public.staff_barcode_authorizations (
  auth_user_id uuid primary key references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Track passcode login attempts without storing source IPs or raw passcodes.
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
alter table public.staff_barcode_credentials enable row level security;
alter table public.staff_passcode_credentials enable row level security;
alter table public.staff_barcode_authorizations enable row level security;
alter table public.staff_passcode_login_attempts enable row level security;

-- Shift history is readable by the owner/admin and by the staff member themselves.
drop policy if exists "staff_shifts_read_owner_admin_or_self" on public.staff_shifts;
create policy "staff_shifts_read_owner_admin_or_self"
  on public.staff_shifts for select to authenticated
  using (staff_id = auth.uid() or public.odancia_is_owner_or_admin());

-- Barcode credentials are visible to owner/admin only; writes are service-side only.
drop policy if exists "staff_barcode_credentials_read_owner_admin" on public.staff_barcode_credentials;
create policy "staff_barcode_credentials_read_owner_admin"
  on public.staff_barcode_credentials for select to authenticated
  using (public.odancia_is_owner_or_admin());

revoke all on public.staff_passcode_credentials from anon, authenticated;
revoke all on public.staff_barcode_authorizations from anon, authenticated;
revoke all on public.staff_passcode_login_attempts from anon, authenticated;
revoke insert, update, delete on public.staff_shifts from anon, authenticated;
revoke insert, update, delete on public.staff_barcode_credentials from anon, authenticated;
grant select on table public.staff_shifts, public.staff_barcode_credentials to authenticated;
grant all on table public.staff_shifts, public.staff_barcode_credentials,
  public.staff_passcode_credentials, public.staff_barcode_authorizations,
  public.staff_passcode_login_attempts to service_role;
grant usage, select on sequence public.staff_passcode_login_attempts_id_seq to service_role;

create or replace function public.odancia_has_recent_barcode_authorization()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.staff_barcode_authorizations a
     where a.auth_user_id = auth.uid()
       and a.expires_at > now()
  );
$$;
revoke all on function public.odancia_has_recent_barcode_authorization() from public, anon;
grant execute on function public.odancia_has_recent_barcode_authorization() to authenticated;

-- Restrictive policies are ANDed with existing permissive policies, so existing
-- role rules remain in force while staff writes additionally need barcode approval.
-- Admin/owner actions remain unchanged.
do $$
declare
  t text;
  cmd text;
  pol text;
begin
  foreach t in array array['clients','services','payments'] loop
    foreach cmd in array array['INSERT','UPDATE','DELETE'] loop
      pol := 'odancia_barcode_gate_' || t || '_' || lower(cmd);
      execute format('drop policy if exists %I on public.%I', pol, t);
      if cmd = 'INSERT' then
        execute format(
          'create policy %I on public.%I as restrictive for insert to authenticated with check (public.odancia_is_owner_or_admin() or public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      elsif cmd = 'UPDATE' then
        execute format(
          'create policy %I on public.%I as restrictive for update to authenticated using (public.odancia_is_owner_or_admin() or public.odancia_has_recent_barcode_authorization()) with check (public.odancia_is_owner_or_admin() or public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      else
        execute format(
          'create policy %I on public.%I as restrictive for delete to authenticated using (public.odancia_is_owner_or_admin() or public.odancia_has_recent_barcode_authorization())',
          pol, t
        );
      end if;
    end loop;
  end loop;
end $$;

-- The payment RPC is SECURITY DEFINER and therefore validates the authorization
-- itself instead of relying only on table RLS.
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

  select role::text into v_role
    from public.profiles
   where id = v_actor and is_active = true;

  if v_role not in ('owner', 'admin', 'staff') or v_role is null then
    raise exception 'Active staff profile required.' using errcode = '42501';
  end if;

  if v_role = 'staff' and not public.odancia_has_recent_barcode_authorization() then
    raise exception 'Scan your personal staff barcode while clocked in to authorize this payment.' using errcode = '42501';
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

-- Audit shift starts/ends using the profile ID supplied by the server action.
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

  select full_name into v_actor_name
    from public.profiles
   where id = v_actor_id;

  insert into public.audit_logs (
    table_name, record_id, action, actor_id, actor_name,
    old_data, new_data, created_at
  ) values (
    'staff_shifts', v_record_id, tg_op, v_actor_id, v_actor_name,
    v_old_data, v_new_data, now()
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists odancia_staff_shifts_audit on public.staff_shifts;
create trigger odancia_staff_shifts_audit
after insert or update or delete on public.staff_shifts
for each row execute function public.odancia_audit_staff_shift_change();

comment on table public.staff_passcode_credentials is 'Private server-side lookup for passcode-only staff sign-in. passcode_lookup_hash is a keyed HMAC, never the raw passcode.';
comment on table public.staff_barcode_authorizations is 'Private short-lived row used by RLS to gate staff writes after server-side barcode and on-duty validation.';
comment on table public.staff_shifts is 'Clock-in/out history; writes are performed by validated server-side actions and audited.';

notify pgrst, 'reload schema';

-- Show explicit post-migration checks in Supabase SQL Editor.
with required_objects (item, present) as (
  select 'services.base_price', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'base_price'
  )
  union all
  select 'services.is_express', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'is_express'
  )
  union all
  select 'services.express_earliest_at', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'express_earliest_at'
  )
  union all
  select 'services.expected_completion_at', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'expected_completion_at'
  )
  union all
  select 'profiles.address', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'address'
  )
  union all
  select 'profiles.contact_email', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'contact_email'
  )
  union all
  select 'staff_shifts table', to_regclass('public.staff_shifts') is not null
  union all
  select 'staff_barcode_credentials table', to_regclass('public.staff_barcode_credentials') is not null
  union all
  select 'staff_passcode_credentials table', to_regclass('public.staff_passcode_credentials') is not null
  union all
  select 'staff_barcode_authorizations table', to_regclass('public.staff_barcode_authorizations') is not null
  union all
  select 'staff_passcode_login_attempts table', to_regclass('public.staff_passcode_login_attempts') is not null
  union all
  select 'odancia_record_service_payments function', to_regprocedure('public.odancia_record_service_payments(uuid,numeric[],text[],uuid)') is not null
  union all
  select 'odancia_has_recent_barcode_authorization function', to_regprocedure('public.odancia_has_recent_barcode_authorization()') is not null
)
select item, case when present then 'OK' else 'MISSING' end as status
from required_objects
order by item;
