-- =====================================================================
-- Horas registrables (Configuración)
-- Registro interno de horas trabajadas que pueden no trasladarse al
-- cliente: fecha, horas, concepto, observación, imagen y si se facturaron.
-- Sólo staff (ADMIN / CONSULTANT).
-- =====================================================================

create table if not exists public.work_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  log_date    date not null default current_date,
  hours       numeric(8,2) not null check (hours > 0),
  concept     text not null,
  notes       text,
  image_path  text,
  image_name  text,
  invoiced    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists work_logs_idx on public.work_logs (project_id, log_date desc);

alter table public.work_logs enable row level security;
drop policy if exists work_logs_staff_all on public.work_logs;
create policy work_logs_staff_all on public.work_logs
  for all using (public.is_staff()) with check (public.is_staff());

-- Las imágenes se guardan en el bucket público 'attachments' (prefijo work-logs/).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;
