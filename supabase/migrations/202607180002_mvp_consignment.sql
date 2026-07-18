-- InventoryHub phases 2-3 MVP: master data, orders, consignments, approval, and balance ledger.
create table public.customers (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  customer_type text not null check (customer_type in ('company','individual')), phone text,
  source_type text not null default 'manual', external_id text, active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  specification text, unit text not null default '件', active boolean not null default true,
  source_type text not null default 'manual', external_id text,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id)
);
create table public.warehouses (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  active boolean not null default true, source_type text not null default 'manual', external_id text,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_no text not null unique,
  customer_id uuid not null references public.customers(id), order_date date not null,
  source_type text not null default 'manual', external_id text, is_manual boolean not null default false,
  manual_reason text, created_at timestamptz not null default now(), created_by uuid references public.profiles(id)
);
create table public.order_lines (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id), ordered_qty integer not null check (ordered_qty > 0),
  delivered_qty integer not null default 0 check (delivered_qty >= 0), unit_price numeric(18,4) not null default 0,
  discount_amount numeric(18,4) not null default 0, created_at timestamptz not null default now(),
  check (delivered_qty <= ordered_qty)
);
create table public.consignments (
  id uuid primary key default gen_random_uuid(), consignment_no text not null unique,
  order_id uuid not null references public.orders(id), customer_id uuid not null references public.customers(id),
  deadline date, note text, status text not null default 'draft'
    check (status in ('draft','pending','active','partially_withdrawn','settled','cancelled')),
  created_at timestamptz not null default now(), created_by uuid not null references public.profiles(id),
  approved_at timestamptz, approved_by uuid references public.profiles(id), cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id), check (approved_by is null or approved_by <> created_by)
);
create table public.consignment_lines (
  id uuid primary key default gen_random_uuid(), consignment_id uuid not null references public.consignments(id) on delete restrict,
  order_line_id uuid not null references public.order_lines(id), product_id uuid not null references public.products(id),
  warehouse_id uuid not null references public.warehouses(id), qty integer not null check (qty > 0),
  remaining_qty integer not null check (remaining_qty >= 0), average_price numeric(18,4) not null default 0,
  effective_at timestamptz, created_at timestamptz not null default now(), check (remaining_qty <= qty)
);
create table public.consignment_audits (
  id bigint generated always as identity primary key, consignment_id uuid not null references public.consignments(id),
  action text not null, actor_id uuid not null references public.profiles(id), actor_name text not null,
  note text, before_data jsonb, after_data jsonb, occurred_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders(customer_id, order_date desc);
create index consignments_customer_status_idx on public.consignments(customer_id, status);
create index consignment_lines_balance_idx on public.consignment_lines(product_id, warehouse_id) where remaining_qty > 0;
create index consignment_audits_timeline_idx on public.consignment_audits(consignment_id, occurred_at desc);

alter table public.customers enable row level security; alter table public.products enable row level security;
alter table public.warehouses enable row level security; alter table public.orders enable row level security;
alter table public.order_lines enable row level security; alter table public.consignments enable row level security;
alter table public.consignment_lines enable row level security; alter table public.consignment_audits enable row level security;

create policy customers_read on public.customers for select to authenticated using (public.has_permission('consignment.view'));
create policy products_read on public.products for select to authenticated using (public.has_permission('consignment.view'));
create policy warehouses_read on public.warehouses for select to authenticated using (public.has_permission('consignment.view'));
create policy orders_read on public.orders for select to authenticated using (public.has_permission('consignment.view'));
create policy order_lines_read on public.order_lines for select to authenticated using (public.has_permission('consignment.view'));
create policy consignments_read on public.consignments for select to authenticated using (public.has_permission('consignment.view'));
create policy consignment_lines_read on public.consignment_lines for select to authenticated using (public.has_permission('consignment.view'));
create policy consignment_audits_read on public.consignment_audits for select to authenticated using (public.has_permission('consignment.view'));
create policy customers_write on public.customers for all to authenticated using (public.has_permission('consignment.create')) with check (public.has_permission('consignment.create'));
create policy products_write on public.products for all to authenticated using (public.has_permission('consignment.create')) with check (public.has_permission('consignment.create'));
create policy warehouses_write on public.warehouses for all to authenticated using (public.has_permission('access.manage')) with check (public.has_permission('access.manage'));
create policy orders_write on public.orders for all to authenticated using (public.has_permission('consignment.create')) with check (public.has_permission('consignment.create'));
create policy order_lines_write on public.order_lines for all to authenticated using (public.has_permission('consignment.create')) with check (public.has_permission('consignment.create'));

revoke update, delete on public.consignment_audits from authenticated, anon;
comment on table public.consignments is 'Mutations after activation must be performed through trusted transaction functions.';
