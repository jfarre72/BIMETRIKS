-- =====================================================================
-- Facturación: observación libre por bloque de horas contratadas.
-- Editable desde la pantalla Facturación (staff).
-- =====================================================================

alter table public.contracted_hours add column if not exists observation text;
