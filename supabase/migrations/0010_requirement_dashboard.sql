-- =====================================================================
-- Campo "Dashboard" en requerimientos
-- El solicitante indica en qué dashboard y página quiere el requerimiento.
-- =====================================================================

alter table public.requirements
  add column if not exists dashboard text;
