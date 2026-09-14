-- =====================================================================
-- Archivar sprints + Facturación de bloques + Documentación del proyecto
-- =====================================================================

-- Archivar sprints (soft) --------------------------------------------------
alter table public.sprints add column if not exists archived_at timestamptz;

-- Facturación por bloque de horas contratadas ------------------------------
alter table public.contracted_hours add column if not exists invoiced boolean not null default false;
alter table public.contracted_hours add column if not exists paid boolean not null default false;

-- Documentación del proyecto (archivos sueltos, relevamientos, PDFs) --------
create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  path        text not null,
  name        text,
  mime        text,
  size        bigint,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists project_documents_idx on public.project_documents (project_id);

alter table public.project_documents enable row level security;
drop policy if exists project_documents_staff_all on public.project_documents;
create policy project_documents_staff_all on public.project_documents
  for all using (public.is_staff()) with check (public.is_staff());

-- Reutilizamos el bucket 'attachments' (ya público). Si no existe:
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;
