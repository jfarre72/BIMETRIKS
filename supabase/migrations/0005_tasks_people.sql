-- =====================================================================
-- Tareas + Responsables (personas configurables, no usuarios de login)
-- =====================================================================

-- Responsables configurables ------------------------------------------------
create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  role        text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists people_idx on public.people (project_id, sort_order);
alter table public.people enable row level security;
drop policy if exists people_staff_all on public.people;
create policy people_staff_all on public.people
  for all using (public.is_staff()) with check (public.is_staff());

-- Repuntar los FKs de responsable/validación de requerimientos a `people`.
update public.requirements set assignee_id = null, validator_id = null;
alter table public.requirements drop constraint if exists requirements_assignee_id_fkey;
alter table public.requirements drop constraint if exists requirements_validator_id_fkey;
alter table public.requirements
  add constraint requirements_assignee_id_fkey foreign key (assignee_id) references public.people(id) on delete set null;
alter table public.requirements
  add constraint requirements_validator_id_fkey foreign key (validator_id) references public.people(id) on delete set null;

-- Tareas / pendientes -------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  detail      text,
  assignee    text,
  label       text,            -- URGENTE / NORMAL / ...
  due_date    date,
  done        boolean not null default false,
  done_at     timestamptz,
  sort_index  numeric not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_idx on public.tasks (project_id, done, due_date);
alter table public.tasks enable row level security;
drop policy if exists tasks_staff_all on public.tasks;
create policy tasks_staff_all on public.tasks
  for all using (public.is_staff()) with check (public.is_staff());

create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();
