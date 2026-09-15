import { createClient } from "@/lib/supabase/server";
import { getProjectId } from "@/lib/project";
import { cached } from "@/lib/cache";
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
  id, code, title, description, module, estimated_hours, observations, sort_index,
  area_id, type_id, priority_id, status_id, assignee_id, validator_id,
  created_at, updated_at,
  area:areas(id,name),
  type:req_types(id,name,color),
  priority:req_priorities(id,name,color,weight),
  status:req_statuses(id,name,color,is_final),
  assignee:people!requirements_assignee_id_fkey(id,name,role),
  validator:people!requirements_validator_id_fkey(id,name,role),
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
  return cached("catalogs", 30_000, _getCatalogs);
}

async function _getCatalogs(): Promise<Catalogs> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [areas, statuses, priorities, types, people, sprints] = await Promise.all([
    supabase.from("areas").select("id,name,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_statuses").select("id,name,color,is_final,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_priorities").select("id,name,color,weight").eq("project_id", PROJECT_ID).order("weight", { ascending: false }),
    supabase.from("req_types").select("id,name,color").eq("project_id", PROJECT_ID).order("name"),
    supabase.from("people").select("id,name,role,sort_order").eq("project_id", PROJECT_ID).order("sort_order").order("name"),
    supabase.from("sprints").select("id,name,status").eq("project_id", PROJECT_ID).is("archived_at", null).order("created_at", { ascending: false }),
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
  return cached("requirements", 8000, _getRequirements);
}
async function _getRequirements(): Promise<Requirement[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("requirements")
    .select(REQ_SELECT)
    .eq("project_id", PROJECT_ID)
    .is("archived_at", null)
    .order("sort_index", { ascending: true });
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

export async function getAttachments(reqId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("requirement_attachments")
    .select("id,requirement_id,path,name,mime,created_at")
    .eq("requirement_id", reqId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((a: any) => ({
    ...a,
    url: supabase.storage.from("attachments").getPublicUrl(a.path).data.publicUrl,
  }));
}

export async function getSprints(): Promise<Sprint[]> {
  return cached("sprints", 8000, _getSprints);
}
async function _getSprints(): Promise<Sprint[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [{ data: sprints }, { data: hours }, { data: links }] = await Promise.all([
    supabase.from("sprints").select("*").eq("project_id", PROJECT_ID).is("archived_at", null).order("created_at", { ascending: false }),
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
    .map(shapeRequirement)
    .sort((a: Requirement, b: Requirement) => Number(a.sort_index ?? 0) - Number(b.sort_index ?? 0));
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
  return cached("projectHours", 8000, _getProjectHours);
}
async function _getProjectHours() {
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

export async function getClientName(): Promise<string> {
  return cached("clientName", 60_000, async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("client:clients(name)")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    return ((data as any)?.client?.name as string) ?? "Cliente";
  });
}

/**
 * Bloques de horas contratadas (por fecha de registro). El consumo se asigna
 * FIFO: primero se agota el bloque más antiguo. Es lo más simple de mantener y
 * no requiere etiquetar cada carga de horas a un bloque puntual.
 */
export interface HourBlock {
  label: string;
  contracted: number;
  consumed: number;
  available: number;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export async function getHourBlocks(): Promise<HourBlock[]> {
  return cached("hourBlocks", 15_000, async () => {
    const supabase = createClient();
    const PROJECT_ID = await getProjectId();
    const [{ data: blocks }, { data: total }] = await Promise.all([
      supabase.from("contracted_hours").select("entry_date,hours,note").eq("project_id", PROJECT_ID).order("entry_date", { ascending: true }),
      supabase.from("v_project_hours").select("consumed_hours").eq("project_id", PROJECT_ID).single(),
    ]);
    let remaining = Number(total?.consumed_hours ?? 0);
    return (blocks ?? []).map((b: any) => {
      const d = new Date(b.entry_date);
      const label = b.note?.trim() || `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      const contracted = Number(b.hours);
      const consumed = Math.min(contracted, remaining);
      remaining -= consumed;
      return { label, contracted, consumed, available: contracted - consumed };
    });
  });
}

export async function getTasks() {
  return cached("tasks", 6000, _getTasks);
}
async function _getTasks() {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,detail,assignee,label,due_date,done,created_at")
    .eq("project_id", PROJECT_ID)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function getPeople() {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("people")
    .select("id,name,role,sort_order")
    .eq("project_id", PROJECT_ID)
    .order("sort_order")
    .order("name");
  return (data ?? []) as any[];
}

export async function getArchivedSprints(): Promise<Sprint[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .not("archived_at", "is", null)
    .order("created_at", { ascending: false });
  return (data as any) ?? [];
}

export async function getArchivedSprintIds(): Promise<string[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("sprints")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .not("archived_at", "is", null);
  return (data ?? []).map((s: any) => s.id);
}

export interface BillingBlock {
  id: string;
  label: string;
  entry_date: string;
  contracted: number;
  consumed: number;
  invoiced: boolean;
  paid: boolean;
  invoicePath: string | null;
  invoiceName: string | null;
  invoiceUrl: string | null;
}

export async function getBillingBlocks(): Promise<BillingBlock[]> {
  return cached("billing", 8000, _getBillingBlocks);
}
async function _getBillingBlocks(): Promise<BillingBlock[]> {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [{ data: blocks }, { data: total }] = await Promise.all([
    supabase
      .from("contracted_hours")
      .select("id,entry_date,hours,note,invoiced,paid,invoice_path,invoice_name")
      .eq("project_id", PROJECT_ID)
      .order("entry_date", { ascending: true }),
    supabase.from("v_project_hours").select("consumed_hours").eq("project_id", PROJECT_ID).single(),
  ]);
  let remaining = Number(total?.consumed_hours ?? 0);
  return (blocks ?? []).map((b: any) => {
    const d = new Date(b.entry_date);
    const label = b.note?.trim() || `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const contracted = Number(b.hours);
    const consumed = Math.min(contracted, remaining);
    remaining -= consumed;
    const invoiceUrl = b.invoice_path ? supabase.storage.from("attachments").getPublicUrl(b.invoice_path).data.publicUrl : null;
    return {
      id: b.id, label, entry_date: b.entry_date, contracted, consumed,
      invoiced: !!b.invoiced, paid: !!b.paid,
      invoicePath: b.invoice_path ?? null, invoiceName: b.invoice_name ?? null, invoiceUrl,
    };
  });
}

export async function getProjectDocuments() {
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const { data } = await supabase
    .from("project_documents")
    .select("id,path,name,mime,size,created_at")
    .eq("project_id", PROJECT_ID)
    .order("created_at", { ascending: false });
  return (data ?? []).map((d: any) => ({
    ...d,
    url: supabase.storage.from("attachments").getPublicUrl(d.path).data.publicUrl,
  }));
}

export async function getContractedHours(): Promise<ContractedHours[]> {
  return cached("contractedHours", 8000, _getContractedHours);
}
async function _getContractedHours(): Promise<ContractedHours[]> {
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
  return cached(`timeEntries:${limit}`, 8000, () => _getTimeEntries(limit));
}
async function _getTimeEntries(limit: number): Promise<TimeEntry[]> {
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
  blocks: HourBlock[];
}

export async function getDashboard(): Promise<DashboardData> {
  const [hours, requirements, blocks] = await Promise.all([
    getProjectHours(),
    getRequirements(),
    getHourBlocks(),
  ]);
  return { hours, requirements, blocks };
}
