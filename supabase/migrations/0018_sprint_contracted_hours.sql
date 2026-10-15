-- =====================================================================
-- Horas contratadas por sprint.
-- Se cargan desde Reportería (input del reporte PDF) y se usan para el
-- % de uso del sprint: utilizadas / contratadas.
-- =====================================================================

alter table public.sprints add column if not exists contracted_hours numeric(8,2)
  check (contracted_hours is null or contracted_hours >= 0);
