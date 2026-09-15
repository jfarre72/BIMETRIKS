-- =====================================================================
-- Las horas registradas se borran junto con su requerimiento.
-- =====================================================================
alter table public.time_entries drop constraint if exists time_entries_requirement_id_fkey;
alter table public.time_entries
  add constraint time_entries_requirement_id_fkey
  foreign key (requirement_id) references public.requirements(id) on delete cascade;
