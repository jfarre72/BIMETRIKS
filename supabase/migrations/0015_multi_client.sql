-- =====================================================================
-- Multi-cliente
--
-- 1) Aislamiento por cliente: un CLIENT sólo ve (y crea) datos de los
--    proyectos de SU cliente (profiles.client_id). Antes, las políticas de
--    0009/0011/0013 dejaban leer TODO a cualquier CLIENT.
-- 2) Las vistas de horas pasan a respetar el RLS de quien consulta.
-- 3) create_client_project(): alta de cliente + proyecto, copiando los
--    catálogos genéricos (estados, prioridades, tipos) del primer proyecto.
--
-- El staff (ADMIN/CONSULTANT) mantiene acceso total (políticas *_staff_all).
-- =====================================================================

-- ¿El usuario actual es CLIENT y el proyecto pertenece a su cliente? --------
create or replace function public.client_can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles pr
    join public.projects p on p.client_id = pr.client_id
    where pr.id = auth.uid()
      and pr.role = 'CLIENT'
      and p.id = p_project_id
  );
$$;

create or replace function public.client_can_access_requirement(p_requirement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requirements r
    where r.id = p_requirement_id
      and public.client_can_access_project(r.project_id)
  );
$$;

-- Lectura CLIENT: tablas con project_id -------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'areas','req_statuses','req_priorities','req_types','requirements','sprints',
    'contracted_hours','time_entries','people','tasks','dashboards'
  ] loop
    execute format('drop policy if exists %I_client_read on public.%I;', t, t);
    execute format(
      'create policy %I_client_read on public.%I for select using (public.client_can_access_project(project_id));',
      t, t);
  end loop;
end $$;

-- Lectura CLIENT: tablas colgadas de un requerimiento -----------------------
do $$
declare t text;
begin
  foreach t in array array['requirement_notes','requirement_attachments','requirement_checklist'] loop
    execute format('drop policy if exists %I_client_read on public.%I;', t, t);
    execute format(
      'create policy %I_client_read on public.%I for select using (public.client_can_access_requirement(requirement_id));',
      t, t);
  end loop;
end $$;

drop policy if exists sprint_requirements_client_read on public.sprint_requirements;
create policy sprint_requirements_client_read on public.sprint_requirements
  for select using (
    exists (select 1 from public.sprints s
            where s.id = sprint_id and public.client_can_access_project(s.project_id))
  );

drop policy if exists clients_client_read on public.clients;
create policy clients_client_read on public.clients
  for select using (
    public.is_client() and id = (select client_id from public.profiles where id = auth.uid())
  );

drop policy if exists projects_client_read on public.projects;
create policy projects_client_read on public.projects
  for select using (public.client_can_access_project(id));

-- Altas del CLIENT, acotadas a sus proyectos ---------------------------------
drop policy if exists requirements_client_insert on public.requirements;
create policy requirements_client_insert on public.requirements
  for insert with check (
    public.client_can_access_project(project_id) and created_by = auth.uid()
  );

drop policy if exists dashboards_client_insert on public.dashboards;
create policy dashboards_client_insert on public.dashboards
  for insert with check (public.client_can_access_project(project_id));

drop policy if exists req_attachments_client_insert on public.requirement_attachments;
create policy req_attachments_client_insert on public.requirement_attachments
  for insert with check (public.client_can_access_requirement(requirement_id));

-- Vistas de horas: que apliquen el RLS del usuario que consulta --------------
alter view public.v_project_hours     set (security_invoker = true);
alter view public.v_sprint_hours      set (security_invoker = true);
alter view public.v_requirement_hours set (security_invoker = true);

-- Alta de cliente + proyecto ---------------------------------------------------
-- Uso (SQL Editor):  select public.create_client_project('NAIKA');
-- Devuelve el id del proyecto creado. Sólo staff (o el SQL Editor/service_role).
create or replace function public.create_client_project(
  p_client_name  text,
  p_project_name text default 'Servicio Data & Analytics',
  p_code         text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_name      text := nullif(trim(p_client_name), '');
  v_client_id uuid;
  v_project   uuid;
  v_template  uuid;
  v_code      text;
begin
  -- auth.uid() es null desde el SQL Editor / service_role: se permite.
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Sólo ADMIN/CONSULTANT pueden dar de alta clientes';
  end if;
  if v_name is null then
    raise exception 'El nombre del cliente es obligatorio';
  end if;
  if exists (select 1 from public.clients where lower(name) = lower(v_name)) then
    raise exception 'Ya existe un cliente llamado "%"', v_name;
  end if;

  -- Proyecto plantilla: el más antiguo (de él se copian los catálogos).
  select id into v_template from public.projects order by created_at asc limit 1;

  insert into public.clients (name) values (v_name) returning id into v_client_id;

  v_code := coalesce(
    nullif(trim(p_code), ''),
    upper(left(regexp_replace(v_name, '[^A-Za-z0-9]', '', 'g'), 6)) || '-01'
  );
  insert into public.projects (client_id, name, code)
  values (v_client_id, coalesce(nullif(trim(p_project_name), ''), 'Servicio Data & Analytics'), v_code)
  returning id into v_project;

  if v_template is not null then
    insert into public.req_statuses (project_id, name, color, sort_order, is_final)
      select v_project, name, color, sort_order, is_final from public.req_statuses where project_id = v_template;
    insert into public.req_priorities (project_id, name, color, weight)
      select v_project, name, color, weight from public.req_priorities where project_id = v_template;
    insert into public.req_types (project_id, name, color)
      select v_project, name, color from public.req_types where project_id = v_template;
  end if;

  return v_project;
end;
$$;

grant execute on function public.create_client_project(text, text, text) to authenticated;
