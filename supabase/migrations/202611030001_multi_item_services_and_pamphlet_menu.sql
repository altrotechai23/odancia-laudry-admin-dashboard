-- Odancia: support multiple individually priced service items under one service.
-- Existing services and payments are preserved; legacy records remain valid.

alter table public.services
  add column if not exists price_pending boolean not null default false;

alter table public.service_types add column if not exists display_order integer;

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  service_type_id uuid references public.service_types(id) on delete set null,
  service_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2),
  line_total numeric(12,2),
  price_pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_items_price_state_check check (
    (price_pending = true and unit_price is null and line_total is null)
    or (price_pending = false and unit_price is not null and line_total is not null)
  )
);

create index if not exists service_items_service_id_idx on public.service_items(service_id);

alter table public.service_items enable row level security;
grant select, insert, update, delete on public.service_items to authenticated;

-- Match the existing authenticated staff/admin workflow for service records.
drop policy if exists "Authenticated users can read service items" on public.service_items;
create policy "Authenticated users can read service items"
  on public.service_items for select to authenticated using (true);

drop policy if exists "Authenticated users can manage service items" on public.service_items;
create policy "Authenticated users can manage service items"
  on public.service_items for all to authenticated using (true) with check (true);

-- Seed the service choices from the Odancia pamphlet without overwriting existing prices/names.
-- Prices are defaults shown in the UI; staff may negotiate a different price per item.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('Wash, dry, fold 1 load (Colour)', 'R195', 10),
      ('Ironing per kg', 'R150', 20),
      ('Drying per Basket', 'R150', 30),
      ('Wash, dry Blanket Double', 'R350', 40),
      ('Wash, dry Blanket Queen', 'R450', 50),
      ('Bed sheets Single', 'R35', 60),
      ('Bed sheets Double', 'R50', 70),
      ('Dry Cleaning Wedding Dress', 'R1200', 80),
      ('Stay-soft per wash load', 'R20', 90),
      ('Steam Iron Suits', 'R150', 100),
      ('Steam Iron Dresses Long', 'R200', 110),
      ('Steam Iron Dresses Short', 'R100', 120),
      ('Curtains - Wash, dry, iron / KG', 'R160', 130),
      ('Shoes - Tekkkies wash dry / Pair', 'R180', 140)
    ) as v(name, pamphlet_price, sort_order)
  loop
    if not exists (select 1 from public.service_types where lower(name) = lower(item.name)) then
      insert into public.service_types(name, description, is_active)
      values (item.name, 'Pamphlet price: ' || item.pamphlet_price || '. Editable negotiated price.', true);
    else
      update public.service_types
         set description = concat_ws(' ', nullif(description, ''), 'Pamphlet price: ' || item.pamphlet_price || '. Editable negotiated price.'),
             is_active = true
       where lower(name) = lower(item.name)
         and coalesce(description, '') not ilike '%Pamphlet price:%';
    end if;
    update public.service_types set display_order = item.sort_order, is_active = true where lower(name) = lower(item.name);
  end loop;
end $$;

comment on column public.services.price_pending is 'True when one or more service items still need an agreed price.';
comment on table public.service_items is 'Individual laundry or extra-service lines grouped under one service and invoice.';

notify pgrst, 'reload schema';


-- Permit the new audited price-confirmation action while preserving existing checks.
DO $$
DECLARE
  v_constraint_def text;
  v_check_expr text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'audit_logs'
    AND c.contype = 'c' AND c.conname = 'audit_logs_action_check'
  LIMIT 1;
  IF v_constraint_def IS NOT NULL THEN
    v_check_expr := regexp_replace(v_constraint_def, '^CHECK \((.*)\)$', '\1');
    ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check;
    EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK ((' || v_check_expr || ') OR (action::text = ANY (ARRAY[''STAFF_CONFIRM_SERVICE_PRICES'', ''ADMIN_CONFIRM_SERVICE_PRICES'']::text[])))';
  END IF;
END $$;
