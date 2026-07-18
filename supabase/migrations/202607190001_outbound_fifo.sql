-- InventoryHub outbound / customer pickup workflow
create type outbound_status as enum ('draft', 'pending_approval', 'effective', 'cancelled');

create table if not exists outbound_orders (
  id uuid primary key default gen_random_uuid(),
  outbound_no text not null unique,
  customer_id uuid not null references customers(id),
  planned_date date,
  actual_date date,
  receiver text,
  phone text,
  vehicle_no text,
  note text,
  status outbound_status not null default 'draft',
  created_by uuid not null references profiles(id),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists outbound_lines (
  id uuid primary key default gen_random_uuid(),
  outbound_id uuid not null references outbound_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  warehouse_id uuid not null references warehouses(id),
  quantity integer not null check (quantity > 0)
);

create table if not exists outbound_allocations (
  id uuid primary key default gen_random_uuid(),
  outbound_line_id uuid not null references outbound_lines(id) on delete cascade,
  consignment_line_id uuid not null references consignment_lines(id),
  allocated_quantity integer not null check (allocated_quantity > 0),
  average_cost numeric(14, 4) not null default 0
);

create index if not exists outbound_orders_customer_status_idx on outbound_orders(customer_id, status);
create index if not exists outbound_allocations_consignment_line_idx on outbound_allocations(consignment_line_id);

alter table outbound_orders enable row level security;
alter table outbound_lines enable row level security;
alter table outbound_allocations enable row level security;

-- Production policies should map authenticated users to profile permissions.
create policy "authenticated users can read outbound orders" on outbound_orders for select to authenticated using (true);
create policy "authenticated users can read outbound lines" on outbound_lines for select to authenticated using (true);
create policy "authenticated users can read outbound allocations" on outbound_allocations for select to authenticated using (true);
