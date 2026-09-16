// Tipos de dominio (subset alineado al esquema Supabase).

export interface Catalog {
  id: string;
  name: string;
  color?: string;
  sort_order?: number;
}

export interface Area extends Catalog {}
export interface ReqStatus extends Catalog {
  color: string;
  is_final: boolean;
}
export interface ReqPriority extends Catalog {
  color: string;
  weight: number;
}
export interface ReqType extends Catalog {
  color: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  role: "ADMIN" | "CONSULTANT" | "CLIENT";
}

/** Responsable configurable (no es un usuario de login). */
export interface Person {
  id: string;
  name: string;
  role: string | null;
  sort_order?: number;
}

export interface Task {
  id: string;
  title: string;
  detail: string | null;
  assignee: string | null;
  label: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface Requirement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  module: string | null;
  estimated_hours: number;
  observations: string | null;
  sort_index?: number;
  area_id: string | null;
  type_id: string | null;
  priority_id: string | null;
  status_id: string | null;
  assignee_id: string | null;
  validator_id: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // joins
  area?: Catalog | null;
  type?: ReqType | null;
  priority?: ReqPriority | null;
  status?: ReqStatus | null;
  assignee?: Person | null;
  validator?: Person | null;
  creator?: { id: string; username: string; full_name: string | null; role: string } | null;
  consumed_hours?: number;
  sprint?: { id: string; name: string } | null;
}

export interface Sprint {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  target_date: string | null;
  status: "Planificado" | "Activo" | "Finalizado" | "Pausado";
  estimated_hours?: number;
  consumed_hours?: number;
  requirement_count?: number;
}

export interface TimeEntry {
  id: string;
  entry_date: string;
  hours: number;
  description: string | null;
  requirement_id: string | null;
  sprint_id: string | null;
  requirement?: { code: string; title: string } | null;
  sprint?: { name: string } | null;
}

export interface ContractedHours {
  id: string;
  entry_date: string;
  hours: number;
  note: string | null;
}

export interface RequirementNote {
  id: string;
  event_type: string;
  event_date: string;
  body: string;
  created_at: string;
  author?: Profile | null;
}

export interface ChecklistItem {
  id: string;
  requirement_id: string;
  text: string;
  done: boolean;
  sort_index: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  requirement_id: string;
  path: string;
  name: string | null;
  mime: string | null;
  url?: string;
  created_at: string;
}

export interface Catalogs {
  areas: Area[];
  statuses: ReqStatus[];
  priorities: ReqPriority[];
  types: ReqType[];
  people: Person[];
  sprints: Pick<Sprint, "id" | "name" | "status">[];
}
