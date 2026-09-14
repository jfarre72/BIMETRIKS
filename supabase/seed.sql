-- =====================================================================
-- Seed BiMetriks: cliente + proyecto + catálogos base.
-- El usuario ADMIN se crea con scripts/create-admin.ts (necesita el
-- service_role key porque escribe en auth.users). Este archivo puebla
-- datos de negocio y es idempotente.
-- =====================================================================

-- Cliente y proyecto inicial ---------------------------------------------------
insert into public.clients (id, name)
values ('00000000-0000-0000-0000-0000000000c1', 'Cliente Demo')
on conflict (id) do nothing;

insert into public.projects (id, client_id, name, code)
values ('00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-0000000000c1', 'Servicio Data & Analytics', 'BMK-01')
on conflict (id) do nothing;

-- Áreas / Capítulos ------------------------------------------------------------
insert into public.areas (project_id, name, sort_order) values
  ('00000000-0000-0000-0000-0000000000b1', 'Nivel de Servicio', 1),
  ('00000000-0000-0000-0000-0000000000b1', 'Gestión de Inventarios', 2),
  ('00000000-0000-0000-0000-0000000000b1', 'Costos', 3),
  ('00000000-0000-0000-0000-0000000000b1', 'Compras', 4)
on conflict do nothing;

-- Estados ----------------------------------------------------------------------
insert into public.req_statuses (project_id, name, color, sort_order, is_final) values
  ('00000000-0000-0000-0000-0000000000b1', 'Nuevo',          '#64748B', 1, false),
  ('00000000-0000-0000-0000-0000000000b1', 'En relevamiento','#0EA5E9', 2, false),
  ('00000000-0000-0000-0000-0000000000b1', 'En análisis',    '#6366F1', 3, false),
  ('00000000-0000-0000-0000-0000000000b1', 'Priorizado',     '#8B5CF6', 4, false),
  ('00000000-0000-0000-0000-0000000000b1', 'Aprobado',       '#0891B2', 5, false),
  ('00000000-0000-0000-0000-0000000000b1', 'En desarrollo',  '#1E5EFF', 6, false),
  ('00000000-0000-0000-0000-0000000000b1', 'En validación',  '#4FB2F0', 7, false),
  ('00000000-0000-0000-0000-0000000000b1', 'Finalizado',     '#16A34A', 8, true),
  ('00000000-0000-0000-0000-0000000000b1', 'Pausado',        '#94A3B8', 9, false)
on conflict do nothing;

-- Prioridades ------------------------------------------------------------------
insert into public.req_priorities (project_id, name, color, weight) values
  ('00000000-0000-0000-0000-0000000000b1', 'Crítica', '#DC2626', 4),
  ('00000000-0000-0000-0000-0000000000b1', 'Alta',    '#EA580C', 3),
  ('00000000-0000-0000-0000-0000000000b1', 'Media',   '#CA8A04', 2),
  ('00000000-0000-0000-0000-0000000000b1', 'Baja',    '#16A34A', 1)
on conflict do nothing;

-- Tipos ------------------------------------------------------------------------
insert into public.req_types (project_id, name, color) values
  ('00000000-0000-0000-0000-0000000000b1', 'Nuevo requerimiento', '#1E5EFF'),
  ('00000000-0000-0000-0000-0000000000b1', 'Corrección',          '#DC2626'),
  ('00000000-0000-0000-0000-0000000000b1', 'Mejora',              '#16A34A'),
  ('00000000-0000-0000-0000-0000000000b1', 'Data Quality',        '#8B5CF6'),
  ('00000000-0000-0000-0000-0000000000b1', 'Optimización',        '#0EA5E9')
on conflict do nothing;
