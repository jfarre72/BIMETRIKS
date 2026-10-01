-- =====================================================================
-- Reuniones (requerimientos de tipo MEETING)
--
-- Las horas de reuniones (semanales, de seguimiento, etc.) no corresponden a
-- un requerimiento, pero tienen que contabilizarse en el sprint y contra las
-- horas contratadas. Se modelan como un requerimiento con kind = 'MEETING':
--   * código propio REU-#### (numeración independiente de REQ-####);
--   * flujo reducido: Nuevo → Priorizado → Estimado → Finalizado (app);
--   * sólo el ADMIN las crea (app); el CLIENT nunca puede insertarlas (RLS).
-- Las horas se cargan en time_entries como cualquier requerimiento, por lo
-- que v_sprint_hours / v_project_hours ya las suman sin cambios.
-- =====================================================================

alter table public.requirements
  add column if not exists kind text not null default 'REQ'
  check (kind in ('REQ', 'MEETING'));

create index if not exists requirements_project_kind_idx on public.requirements (project_id, kind);

alter table public.requirement_counters
  add column if not exists meeting_last_value int not null default 0;

-- Código según el tipo: REQ-#### o REU-#### (contadores separados).
create or replace function public.assign_requirement_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  next_val int;
begin
  if new.code is not null and new.code <> '' then
    return new;
  end if;
  if new.kind = 'MEETING' then
    insert into public.requirement_counters (project_id, last_value, meeting_last_value)
      values (new.project_id, 0, 1)
    on conflict (project_id)
      do update set meeting_last_value = public.requirement_counters.meeting_last_value + 1
    returning meeting_last_value into next_val;
    new.code := 'REU-' || lpad(next_val::text, 4, '0');
  else
    insert into public.requirement_counters (project_id, last_value)
      values (new.project_id, 1)
    on conflict (project_id)
      do update set last_value = public.requirement_counters.last_value + 1
    returning last_value into next_val;
    new.code := 'REQ-' || lpad(next_val::text, 4, '0');
  end if;
  return new;
end;
$$;

-- El CLIENT sólo puede dar de alta requerimientos comunes (no reuniones).
drop policy if exists requirements_client_insert on public.requirements;
create policy requirements_client_insert on public.requirements
  for insert with check (
    public.client_can_access_project(project_id) and created_by = auth.uid() and kind = 'REQ'
  );
