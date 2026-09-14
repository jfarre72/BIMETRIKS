-- =====================================================================
-- Adjuntos de requerimientos (imágenes / archivos) + bucket de Storage
-- =====================================================================

create table if not exists public.requirement_attachments (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  path           text not null,            -- ruta dentro del bucket 'attachments'
  name           text,
  mime           text,
  size           bigint,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists req_attachments_idx on public.requirement_attachments (requirement_id);

alter table public.requirement_attachments enable row level security;

drop policy if exists req_attachments_staff_all on public.requirement_attachments;
create policy req_attachments_staff_all on public.requirement_attachments
  for all using (public.is_staff()) with check (public.is_staff());

-- Bucket de Storage (público de lectura para mostrar las imágenes).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Políticas de Storage: staff puede subir/leer/borrar en el bucket 'attachments'.
drop policy if exists attachments_staff_read on storage.objects;
create policy attachments_staff_read on storage.objects
  for select using (bucket_id = 'attachments');

drop policy if exists attachments_staff_write on storage.objects;
create policy attachments_staff_write on storage.objects
  for insert with check (bucket_id = 'attachments' and public.is_staff());

drop policy if exists attachments_staff_delete on storage.objects;
create policy attachments_staff_delete on storage.objects
  for delete using (bucket_id = 'attachments' and public.is_staff());
