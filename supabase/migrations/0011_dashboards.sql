-- =====================================================================
-- Catálogo de Dashboards (configurable por proyecto)
-- Se usa en el campo "Dashboard" del requerimiento (combobox con búsqueda).
-- Si se escribe uno nuevo al crear un requerimiento, se agrega al listado.
-- =====================================================================

create table if not exists public.dashboards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists dashboards_idx on public.dashboards (project_id, sort_order);

alter table public.dashboards enable row level security;

-- Staff: acceso total (gestión desde Configuración).
drop policy if exists dashboards_staff_all on public.dashboards;
create policy dashboards_staff_all on public.dashboards
  for all using (public.is_staff()) with check (public.is_staff());

-- Cliente: puede leer el listado y agregar uno nuevo al cargar un requerimiento.
drop policy if exists dashboards_client_read on public.dashboards;
create policy dashboards_client_read on public.dashboards
  for select using (public.is_client());

drop policy if exists dashboards_client_insert on public.dashboards;
create policy dashboards_client_insert on public.dashboards
  for insert with check (public.is_client());
