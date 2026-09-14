import { createClient } from "@/lib/supabase/server";
import { getProjectId } from "@/lib/project";
import type {
  Catalogs,
  ContractedHours,
  Requirement,
  RequirementNote,
  Sprint,
  TimeEntry,
} from "@/lib/types";

// Query única de requerimiento: catálogos, horas consumidas (time_entries embebidas)
// y sprint asignado, todo en una sola llamada a la base.
const REQ_SELECT = `
  id, code, title, description, module, estimated_hours, observations,
  area_id, type_id, priority_id, status_id, assignee_id, validator_id,
  created_at, updated_at,
  area:areas(id,name),
  type:req_types(id,name,color),
  priority:req_priorities(id,name,color,weight),
  status:req_statuses(id,name,color,is_final),
  assignee:profiles!requirements_assignee_id_fkey(id,username,full_name,role),
  validator:profiles!requirements_validator_id_fkey(id,username,full_name,role),
  time_entries(hours),
  sprint_requirements(sprint:sprints(id,name))
`;

/** Normaliza el resultado embebido: suma horas y toma el sprint asignado. */
function shapeRequirement(r: any): Requirement {
  const consumed = (r.time_entries ?? []).reduce((acc: number, t: any) => acc + Number(t.hours ?? 0), 0);
  const sprint = r.sprint_requirements?.[0]?.sprint ?? null;
  const { time_entries, sprint_requirements, ...rest } = r;
  return { ...rest, consumed_hours: consumed, sprint };
}

export async function getCatalogs(): Promise<Catalogs> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [areas, statuses, priorities, types, people, sprints] = await Promise.all([
    supabase.from("areas").select("id,name,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_statuses").select("id,name,color,is_final,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_priorities").select("id,name,color,weight").eq("project_id", PROJECT_ID).order("weight", { ascending: false }),
    supabase.from("req_types").select("id,name,color").eq("project_id", PROJECT_ID).order("name"),
    supabase.from("profiles").select("id,username,full_name,role").order("full_name"),
    supabase.from("sprints").select("id,name,status").eq("project_id", PROJECT_ID).order("created_at", { ascending: false }),
  ]);
  return {
    areas: areas.data ?? [],
    statuses: (statuses.data as any) ?? [],
    priorities: (priorities.data as any) ?? [],
    types: (types.data as any) ?? [],
    people: (people.data as any) ?? [],
    sprints: (sprints.data as any) ?? [],
  };
}

export async function getRequirements(): Promise<Requirement[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("requirements")
    .select(REQ_SELECT)
    .eq("project_id", PROJECT_ID)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map(shapeRequirement);
}

export async function getRequirement(id: string): Promise<Requirement | null> {
  const supabase = createClient();
  const { data } = await supabase.from("requirements").select(REQ_SELECT).eq("id", id).single();
  if (!data) return null;
  return shapeRequirement(data);
}

export async function getRequirementNotes(reqId: string): Promise<RequirementNote[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("requirement_notes")
    .select("id,event_type,event_date,body,created_at,author:profiles(id,username,full_name,role)")
    .eq("requirement_id", reqId)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as any) ?? [];
}

export async function getSprints(): Promise<Sprint[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [{ data: sprints }, { data: hours }, { data: links }] = await Promise.all([
    supabase.from("sprints").select("*").eq("project_id", PROJECT_ID).order("created_at", { ascending: false }),
    supabase.from("v_sprint_hours").select("sprint_id,estimated_hours,consumed_hours").eq("project_id", PROJECT_ID),
    supabase.from("sprint_requirements").select("sprint_id"),
  ]);
  const hoursMap: Record<string, { est: number; con: number }> = {};
  (hours ?? []).forEach((h: any) => (hoursMap[h.sprint_id] = { est: Number(h.estimated_hours), con: Number(h.consumed_hours) }));
  const countMap: Record<string, number> = {};
  (links ?? []).forEach((l: any) => (countMap[l.sprint_id] = (countMap[l.sprint_id] ?? 0) + 1));
  return (sprints ?? []).map((s: any) => ({
    ...s,
    estimated_hours: hoursMap[s.id]?.est ?? 0,
    consumed_hours: hoursMap[s.id]?.con ?? 0,
    requirement_count: countMap[s.id] ?? 0,
  }));
}

export async function getSprint(id: string): Promise<{ sprint: Sprint | null; requirements: Requirement[] }> {
  const supabase = createClient();
  const [{ data: sprint }, { data: links }, { data: hours }] = await Promise.all([
    supabase.from("sprints").select("*").eq("id", id).single(),
    supabase.from("sprint_requirements").select(`requirement:requirements(${REQ_SELECT})`).eq("sprint_id", id),
    supabase.from("v_sprint_hours").select("estimated_hours,consumed_hours").eq("sprint_id", id).single(),
  ]);
  if (!sprint) return { sprint: null, requirements: [] };
  const requirements: Requirement[] = (links ?? [])
    .map((l: any) => l.requirement)
    .filter(Boolean)
    .map(shapeRequirement);
  return {
    sprint: {
      ...(sprint as any),
      estimated_hours: Number(hours?.estimated_hours ?? 0),
      consumed_hours: Number(hours?.consumed_hours ?? 0),
      requirement_count: requirements.length,
    },
    requirements,
  };
}

export async function getProjectHours() {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("v_project_hours")
    .select("contracted_hours,consumed_hours")
    .eq("project_id", PROJECT_ID)
    .single();
  const contracted = Number(data?.contracted_hours ?? 0);
  const consumed = Number(data?.consumed_hours ?? 0);
  return { contracted, consumed, available: contracted - consumed };
}

export async function getContractedHours(): Promise<ContractedHours[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("contracted_hours")
    .select("id,entry_date,hours,note")
    .eq("project_id", PROJECT_ID)
    .order("entry_date", { ascending: false });
  return (data as any) ?? [];
}

export async function getTimeEntries(limit = 100): Promise<TimeEntry[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("time_entries")
    .select(
      "id,entry_date,hours,description,requirement_id,sprint_id,requirement:requirements(code,title),sprint:sprints(name)"
    )
    .eq("project_id", PROJECT_ID)
    .order("entry_date", { ascending: false })
    .limit(limit);
  return (data as any) ?? [];
}

export interface DashboardData {
  hours: { contracted: number; consumed: number; available: number };
  requirements: Requirement[];
  activeSprint: Sprint | null;
  recentNotes: RequirementNote[];
  recentEntries: TimeEntry[];
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = createClient();
  const [hours, requirements, sprints, recentEntries, notes] = await Promise.all([
    getProjectHours(),
    getRequirements(),
    getSprints(),
    getTimeEntries(6),
    supabase
      .from("requirement_notes")
      .select("id,event_type,event_date,body,created_at,author:profiles(id,username,full_name,role)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  const activeSprint = sprints.find((s) => s.status === "Activo") ?? sprints[0] ?? null;
  return {
    hours,
    requirements,
    activeSprint,
    recentNotes: (notes.data as any) ?? [],
    recentEntries,
  };
}
