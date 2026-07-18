-- InventoryHub phase 1: identity, roles, permissions, and immutable audit trail.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  employee_no text unique,
  display_name text not null default '',
  email text not null,
  department text,
  status text not null default 'active' check (status in ('active', 'suspended', 'departed')),
  source_type text not null default 'manual' check (source_type in ('manual', 'csv', 'google_sheet', 'sql', 'api')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  primary key (user_id, role_id)
);

create table public.user_permission_overrides (
  user_id uuid not null references public.profiles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  reason text not null,
  expires_at timestamptz,
  granted_at timestamptz not null default now(),
  granted_by uuid not null references public.profiles(id),
  primary key (user_id, permission_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  request_id uuid not null default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_employee_no text,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  source_ip inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, occurred_at desc);
create index profiles_external_idx on public.profiles(source_type, external_id) where external_id is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.has_permission(required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from public.user_permission_overrides upo
      join public.permissions p on p.id = upo.permission_id
      where upo.user_id = auth.uid() and p.code = required_permission
        and upo.effect = 'deny' and (upo.expires_at is null or upo.expires_at > now())
    ) then false
    when exists (
      select 1 from public.user_permission_overrides upo
      join public.permissions p on p.id = upo.permission_id
      where upo.user_id = auth.uid() and p.code = required_permission
        and upo.effect = 'allow' and (upo.expires_at is null or upo.expires_at > now())
    ) then true
    else exists (
      select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid() and p.code = required_permission
    )
  end;
$$;

insert into public.permissions (code, name, module) values
  ('dashboard.view', '查看營運總覽', 'dashboard'),
  ('consignment.view', '查詢寄庫資料', 'consignment'),
  ('consignment.create', '建立寄庫單', 'consignment'),
  ('consignment.approve', '覆核寄庫單', 'consignment'),
  ('withdrawal.execute', '執行客戶提領', 'withdrawal'),
  ('return.create', '建立退貨單', 'return'),
  ('return.approve', '覆核退貨單', 'return'),
  ('inventory.adjust', '調整寄庫數量', 'inventory'),
  ('inventory.reverse', '沖銷寄庫異動', 'inventory'),
  ('cost.view', '查看成交成本', 'cost'),
  ('report.export', '匯出報表', 'report'),
  ('audit.view', '查看完整稽核紀錄', 'audit'),
  ('access.manage', '管理人員與權限', 'access');

insert into public.roles (code, name, description, is_system) values
  ('viewer', '查詢人員', '查詢寄庫資料', true),
  ('operator', '寄庫人員', '建立寄庫及一般作業', true),
  ('warehouse', '倉庫人員', '執行提領與交付', true),
  ('supervisor', '覆核主管', '覆核、調整與沖銷', true),
  ('auditor', '稽核人員', '查看報表及稽核紀錄', true),
  ('admin', '系統管理員', '管理所有功能與權限', true);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'admin';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('dashboard.view','consignment.view')
where r.code = 'viewer';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('dashboard.view','consignment.view','consignment.create','return.create')
where r.code = 'operator';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('dashboard.view','consignment.view','withdrawal.execute')
where r.code = 'warehouse';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('dashboard.view','consignment.view','consignment.create','consignment.approve','withdrawal.execute','return.create','return.approve','inventory.adjust','inventory.reverse','cost.view','report.export','audit.view')
where r.code = 'supervisor';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('dashboard.view','consignment.view','cost.view','report.export','audit.view')
where r.code = 'auditor';

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_self_or_manager on public.profiles for select to authenticated
using (id = auth.uid() or public.has_permission('access.manage'));
create policy profiles_manage on public.profiles for update to authenticated
using (public.has_permission('access.manage')) with check (public.has_permission('access.manage'));
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy user_roles_read on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_permission('access.manage'));
create policy user_roles_manage on public.user_roles for all to authenticated
using (public.has_permission('access.manage')) with check (public.has_permission('access.manage'));
create policy overrides_read on public.user_permission_overrides for select to authenticated
using (user_id = auth.uid() or public.has_permission('access.manage'));
create policy overrides_manage on public.user_permission_overrides for all to authenticated
using (public.has_permission('access.manage')) with check (public.has_permission('access.manage'));
create policy audit_read on public.audit_logs for select to authenticated
using (public.has_permission('audit.view'));

revoke update, delete on public.audit_logs from authenticated, anon;
revoke insert, update, delete on public.roles, public.permissions, public.role_permissions from authenticated, anon;

comment on table public.audit_logs is 'Append-only audit trail. Writes must occur through trusted database functions or Edge Functions.';
