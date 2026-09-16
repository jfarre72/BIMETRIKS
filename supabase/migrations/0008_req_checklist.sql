-- =====================================================================
-- Checklist (subtareas) dentro de un requerimiento
-- =====================================================================

create table if not exists public.requirement_checklist (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  text           text not null,
  done           boolean not null default false,
  done_at        timestamptz,
  sort_index     numeric not null default 0,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists req_checklist_idx on public.requirement_checklist (requirement_id, sort_index);

alter table public.requirement_checklist enable row level security;

drop policy if exists req_checklist_staff_all on public.requirement_checklist;
create policy req_checklist_staff_all on public.requirement_checklist
  for all using (public.is_staff()) with check (public.is_staff());
