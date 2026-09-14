-- =====================================================================
-- Orden manual de requerimientos en el backlog / sprints (drag & drop)
-- =====================================================================
alter table public.requirements
  add column if not exists sort_index numeric not null default 0;

-- Inicializar el orden con la fecha de creación (más nuevo = más abajo).
with ordered as (
  select id, row_number() over (partition by project_id order by created_at) as rn
  from public.requirements
)
update public.requirements r
set sort_index = ordered.rn * 10
from ordered
where ordered.id = r.id and r.sort_index = 0;

create index if not exists requirements_sort_idx on public.requirements (project_id, sort_index);
