-- =====================================================================
-- BiMetriks – Portal de Proyectos
-- Migración inicial: esquema, vistas y RLS
-- Diseñado multi-cliente / multi-proyecto desde el día 1 (aunque el MVP use 1).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helpers de timestamps
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- CLIENTES / PROYECTOS / PERFILES
-- =====================================================================
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete restrict,
  name        text not null,
  code        text not null,
  status      text not null default 'ACTIVE',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, code)
);

-- Perfil de aplicación, ligado a auth.users. El login real es por `username`.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text,
  role        text not null default 'ADMIN' check (role in ('ADMIN','CONSULTANT','CLIENT')),
  client_id   uuid references public.clients(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
-- CATÁLOGOS CONFIGURABLES (por proyecto)
-- =====================================================================
create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.req_statuses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#64748B',
  sort_order  int not null default 0,
  is_final    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.req_priorities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#64748B',
  weight      int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.req_types (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#64748B',
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- REQUERIMIENTOS
-- =====================================================================
-- Secuencia de código REQ-#### por proyecto
create table public.requirement_counters (
  project_id  uuid primary key references public.projects(id) on delete cascade,
  last_value  int not null default 0
);

create table public.requirements (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  code            text not null,
  title           text not null,
  description     text,
  area_id         uuid references public.areas(id) on delete set null,
  module          text,
  type_id         uuid references public.req_types(id) on delete set null,
  priority_id     uuid references public.req_priorities(id) on delete set null,
  status_id       uuid references public.req_statuses(id) on delete set null,
  assignee_id     uuid references public.profiles(id) on delete set null,
  validator_id    uuid references public.profiles(id) on delete set null,
  estimated_hours numeric(8,2) not null default 0,
  observations    text,
  archived_at     timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, code)
);

create index on public.requirements (project_id, status_id);
create index on public.requirements (project_id, area_id);

-- Genera el código REQ-0001 de forma atómica por proyecto
create or replace function public.assign_requirement_code()
returns trigger language plpgsql as $$
declare
  next_val int;
begin
  if new.code is not null and new.code <> '' then
    return new;
  end if;
  insert into public.requirement_counters (project_id, last_value)
    values (new.project_id, 1)
  on conflict (project_id)
    do update set last_value = public.requirement_counters.last_value + 1
  returning last_value into next_val;
  new.code := 'REQ-' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

create trigger trg_requirement_code
  before insert on public.requirements
  for each row execute function public.assign_requirement_code();

-- =====================================================================
-- SPRINTS
-- =====================================================================
create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  description text,
  start_date  date,
  target_date date,
  status      text not null default 'Planificado'
              check (status in ('Planificado','Activo','Finalizado','Pausado')),
  created_by  uuid references public.profiles(id) on delete set null,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Relación N:N sprint <-> requerimiento
create table public.sprint_requirements (
  id             uuid primary key default gen_random_uuid(),
  sprint_id      uuid not null references public.sprints(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  added_by       uuid references public.profiles(id) on delete set null,
  added_at       timestamptz not null default now(),
  unique (sprint_id, requirement_id)
);

-- =====================================================================
-- HORAS
-- =====================================================================
create table public.contracted_hours (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  entry_date  date not null default current_date,
  hours       numeric(8,2) not null check (hours > 0),
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.time_entries (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  sprint_id      uuid references public.sprints(id) on delete set null,
  entry_date     date not null default current_date,
  hours          numeric(8,2) not null check (hours > 0),
  description    text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on public.time_entries (project_id, entry_date);
create index on public.time_entries (requirement_id);
create index on public.time_entries (sprint_id);

-- =====================================================================
-- TIMELINE MANUAL / NOTAS DE REQUERIMIENTO
-- =====================================================================
create table public.requirement_notes (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  event_type     text not null default 'nota',   -- nota | estado | prioridad | horas | hito
  event_date     date not null default current_date,
  body           text not null,
  author_id      uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index on public.requirement_notes (requirement_id, event_date);

-- =====================================================================
-- Triggers updated_at
-- =====================================================================
create trigger trg_clients_updated       before update on public.clients          for each row execute function public.set_updated_at();
create trigger trg_projects_updated       before update on public.projects         for each row execute function public.set_updated_at();
create trigger trg_profiles_updated       before update on public.profiles         for each row execute function public.set_updated_at();
create trigger trg_requirements_updated   before update on public.requirements     for each row execute function public.set_updated_at();
create trigger trg_sprints_updated        before update on public.sprints          for each row execute function public.set_updated_at();
create trigger trg_time_entries_updated   before update on public.time_entries     for each row execute function public.set_updated_at();

-- =====================================================================
-- VISTAS DE MÉTRICAS (horas siempre calculadas, nunca duplicadas)
-- =====================================================================
create or replace view public.v_requirement_hours as
select r.id as requirement_id,
       r.project_id,
       coalesce(sum(t.hours), 0) as consumed_hours
from public.requirements r
left join public.time_entries t on t.requirement_id = r.id
group by r.id, r.project_id;

create or replace view public.v_sprint_hours as
select s.id as sprint_id,
       s.project_id,
       coalesce((select sum(r.estimated_hours)
                 from public.sprint_requirements sr
                 join public.requirements r on r.id = sr.requirement_id
                 where sr.sprint_id = s.id), 0) as estimated_hours,
       coalesce((select sum(t.hours)
                 from public.time_entries t
                 where t.sprint_id = s.id), 0) as consumed_hours
from public.sprints s;

create or replace view public.v_project_hours as
select p.id as project_id,
       coalesce((select sum(c.hours) from public.contracted_hours c where c.project_id = p.id), 0) as contracted_hours,
       coalesce((select sum(t.hours) from public.time_entries t where t.project_id = p.id), 0) as consumed_hours
from public.projects p;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Hoy: ADMIN/CONSULTANT ven todo. CLIENT (etapa 2) quedará acotado por client_id.
-- =====================================================================
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('ADMIN','CONSULTANT') from public.profiles where id = auth.uid()), false);
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','profiles','areas','req_statuses','req_priorities','req_types',
    'requirement_counters','requirements','sprints','sprint_requirements',
    'contracted_hours','time_entries','requirement_notes'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Profiles: cada quien lee su propio perfil; staff lee todos.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid());

-- Staff (ADMIN/CONSULTANT) tiene acceso total al resto (MVP).
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','areas','req_statuses','req_priorities','req_types',
    'requirement_counters','requirements','sprints','sprint_requirements',
    'contracted_hours','time_entries','requirement_notes'
  ] loop
    execute format(
      'create policy %I_staff_all on public.%I for all using (public.is_staff()) with check (public.is_staff());',
      t, t);
  end loop;
end $$;
