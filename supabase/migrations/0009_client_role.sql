-- =====================================================================
-- Rol CLIENT (portal de solo lectura + alta de requerimientos)
--
-- El CLIENT puede:
--   * LEER: inicio, tareas, backlog, sprints, tracking, horas y sus catálogos.
--   * CREAR requerimientos (insert). No puede editar/priorizar/borrar nada.
-- El staff (ADMIN/CONSULTANT) mantiene acceso total (políticas de 0001).
-- =====================================================================

create or replace function public.is_client()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'CLIENT' from public.profiles where id = auth.uid()), false);
$$;

-- El trigger que genera el código REQ-#### escribe en requirement_counters, que
-- sólo es accesible por staff. Lo hacemos SECURITY DEFINER para que un CLIENT
-- pueda insertar requerimientos (el código se sigue generando de forma atómica).
create or replace function public.assign_requirement_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  next_val int;
begin
  if new.code is not null and new.code <> '' then
    return new;
  end if;
  insert into public.requirement_counters (project_id, last_value)
    values (new.project_id, 1)
  on conflict (project_id)
    do update set last_value = public.requirement_counters.last_value + 1
  returning last_value into next_val;
  new.code := 'REQ-' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

-- Lectura para CLIENT en las tablas de las secciones permitidas -------------
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','areas','req_statuses','req_priorities','req_types',
    'requirements','sprints','sprint_requirements','contracted_hours',
    'time_entries','people','requirement_notes','tasks',
    'requirement_attachments','requirement_checklist'
  ] loop
    execute format('drop policy if exists %I_client_read on public.%I;', t, t);
    execute format(
      'create policy %I_client_read on public.%I for select using (public.is_client());',
      t, t);
  end loop;
end $$;

-- Alta de requerimientos por parte del CLIENT (sólo insert; created_by = él) --
drop policy if exists requirements_client_insert on public.requirements;
create policy requirements_client_insert on public.requirements
  for insert with check (public.is_client() and created_by = auth.uid());
