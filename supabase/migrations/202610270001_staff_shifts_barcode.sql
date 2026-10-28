-- Odancia Phase 1 schema addition.
-- Review and apply to a staging Supabase project first.
-- This migration intentionally does not alter existing role enum values or
-- replace the existing audit/payment triggers.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists address text;

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

alter table public.staff_shifts enable row level security;
alter table public.staff_barcode_credentials enable row level security;

-- Read access only. Writes should be routed through validated server actions / RPCs.
drop policy if exists "staff_shifts_read_owner_admin_or_self" on public.staff_shifts;
create policy "staff_shifts_read_owner_admin_or_self"
  on public.staff_shifts for select to authenticated
  using (
    staff_id = auth.uid()
    or public.odancia_is_owner_or_admin()
  );

drop policy if exists "staff_barcode_credentials_read_owner_admin" on public.staff_barcode_credentials;
create policy "staff_barcode_credentials_read_owner_admin"
  on public.staff_barcode_credentials for select to authenticated
  using (public.odancia_is_owner_or_admin());

revoke insert, update, delete on public.staff_shifts from anon, authenticated;
revoke insert, update, delete on public.staff_barcode_credentials from anon, authenticated;

comment on table public.staff_shifts is
  'Clock-in and clock-out history. Writes should be performed by validated server-side operations.';
comment on table public.staff_barcode_credentials is
  'Stores only SHA-256 barcode hashes; never store the raw barcode value here.';
