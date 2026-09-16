-- =====================================================================
-- Empresa del responsable
-- =====================================================================

alter table public.people
  add column if not exists company text;
