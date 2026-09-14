"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProjectId } from "@/lib/project";
import { clearReadCache } from "@/lib/cache";

async function currentProfileId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

// ---------------------------------------------------------------------------
// Requerimientos
// ---------------------------------------------------------------------------
const requirementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.preprocess(emptyToNull, z.string().nullable()),
  module: z.preprocess(emptyToNull, z.string().nullable()),
  area_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  type_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  priority_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  status_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  assignee_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  validator_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  estimated_hours: z.coerce.number().min(0).default(0),
  observations: z.preprocess(emptyToNull, z.string().nullable()),
});

export type ActionResult = { ok: boolean; error?: string; id?: string };

export async function saveRequirement(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = requirementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const supabase = createClient();
  const uid = await currentProfileId();
  const { id, ...values } = parsed.data;

  if (id) {
    const { error } = await supabase
      .from("requirements")
      .update({ ...values, updated_by: uid })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/backlog");
    revalidatePath(`/tracking/${id}`);
    clearReadCache();
  return { ok: true, id };
  }

  const projectId = await getProjectId();
  // Nuevo requerimiento cae al fondo de "Sin asignar" (mayor sort_index + 10).
  const { data: last } = await supabase
    .from("requirements")
    .select("sort_index")
    .eq("project_id", projectId)
    .order("sort_index", { ascending: false })
    .limit(1);
  const nextIndex = Number((last?.[0] as any)?.sort_index ?? 0) + 10;

  const { data, error } = await supabase
    .from("requirements")
    .insert({ ...values, project_id: projectId, sort_index: nextIndex, created_by: uid, updated_by: uid })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/backlog");
  clearReadCache();
  return { ok: true, id: data?.id };
}

/**
 * Recalcula el estado de un sprint según sus requerimientos:
 * sin reqs → Planificado · todos finalizados → Finalizado · caso contrario → Activo.
 * No pisa un sprint en "Pausado" (control manual).
 */
async function syncSprintStatus(supabase: any, sprintId: string) {
  const { data: sprint } = await supabase.from("sprints").select("status").eq("id", sprintId).single();
  if (!sprint || sprint.status === "Pausado") return;
  const { data: links } = await supabase
    .from("sprint_requirements")
    .select("requirement:requirements(status:req_statuses(is_final))")
    .eq("sprint_id", sprintId);
  const reqs = (links ?? []).map((l: any) => l.requirement).filter(Boolean);
  let next: string;
  if (reqs.length === 0) next = "Planificado";
  else if (reqs.every((r: any) => r.status?.is_final)) next = "Finalizado";
  else next = "Activo";
  if (next !== sprint.status) await supabase.from("sprints").update({ status: next }).eq("id", sprintId);
}

export async function updateRequirementField(id: string, field: "status_id" | "priority_id", value: string) {
  const supabase = createClient();
  const uid = await currentProfileId();
  const { data: before } = await supabase.from("requirements").select("status_id").eq("id", id).single();

  const { error } = await supabase
    .from("requirements")
    .update({ [field]: value, updated_by: uid })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Cambio de estado: registrar en el timeline y recalcular el estado del sprint.
  if (field === "status_id" && (before as any)?.status_id !== value) {
    const { data: st } = await supabase.from("req_statuses").select("name").eq("id", value).single();
    await supabase.from("requirement_notes").insert({
      requirement_id: id,
      event_type: "estado",
      event_date: new Date().toISOString().slice(0, 10),
      body: `Estado cambiado a "${(st as any)?.name ?? ""}"`,
      author_id: uid,
    });
    const { data: links } = await supabase.from("sprint_requirements").select("sprint_id").eq("requirement_id", id);
    for (const l of (links ?? []) as any[]) await syncSprintStatus(supabase, l.sprint_id);
  }

  revalidatePath("/backlog");
  revalidatePath("/sprints");
  revalidatePath(`/tracking/${id}`);
  clearReadCache();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notas / timeline manual
// ---------------------------------------------------------------------------
export async function addRequirementNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const reqId = String(formData.get("requirement_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "nota");
  const eventDate = String(formData.get("event_date") ?? "") || new Date().toISOString().slice(0, 10);
  if (!reqId || !body) return { ok: false, error: "Escribí una nota" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { error } = await supabase.from("requirement_notes").insert({
    requirement_id: reqId,
    body,
    event_type: eventType,
    event_date: eventDate,
    author_id: uid,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/tracking/${reqId}`);
  clearReadCache();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sprints
// ---------------------------------------------------------------------------
const sprintSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.preprocess(emptyToNull, z.string().nullable()),
  start_date: z.preprocess(emptyToNull, z.string().nullable()),
  target_date: z.preprocess(emptyToNull, z.string().nullable()),
  status: z.enum(["Planificado", "Activo", "Finalizado", "Pausado"]).default("Planificado"),
});

export async function saveSprint(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = sprintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { id, ...values } = parsed.data;
  if (id) {
    const { error } = await supabase.from("sprints").update({ ...values, updated_by: uid }).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("sprints")
      .insert({ ...values, project_id: await getProjectId(), created_by: uid, updated_by: uid });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/sprints");
  clearReadCache();
  return { ok: true };
}

export async function assignToSprint(sprintId: string, requirementIds: string[]) {
  const supabase = createClient();
  const uid = await currentProfileId();
  const rows = requirementIds.map((requirement_id) => ({ sprint_id: sprintId, requirement_id, added_by: uid }));
  const { error } = await supabase.from("sprint_requirements").upsert(rows, { onConflict: "sprint_id,requirement_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/backlog");
  revalidatePath("/sprints");
  revalidatePath(`/sprints/${sprintId}`);
  clearReadCache();
  return { ok: true };
}

/**
 * Mueve un requerimiento a un grupo (sprint o "sin asignar") y persiste el
 * orden del grupo destino. `targetSprintId` null = sin asignar.
 * `orderedIds` es la lista completa de IDs del grupo destino, en el nuevo orden.
 */
export async function moveRequirement(
  requirementId: string,
  targetSprintId: string | null,
  orderedIds: string[]
) {
  const supabase = createClient();
  const uid = await currentProfileId();

  // Sprints afectados (origen + destino) para recalcular su estado luego.
  const { data: prevLinks } = await supabase.from("sprint_requirements").select("sprint_id").eq("requirement_id", requirementId);
  const affected = new Set<string>([...(prevLinks ?? []).map((l: any) => l.sprint_id)]);
  if (targetSprintId) affected.add(targetSprintId);

  // 1) Reasignar sprint: sacar de cualquier sprint y, si corresponde, asignar al destino.
  await supabase.from("sprint_requirements").delete().eq("requirement_id", requirementId);
  if (targetSprintId) {
    const { error } = await supabase
      .from("sprint_requirements")
      .insert({ sprint_id: targetSprintId, requirement_id: requirementId, added_by: uid });
    if (error) return { ok: false, error: error.message };
  }

  // 2) Persistir el orden del grupo destino (sort_index = posición * 10).
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("requirements").update({ sort_index: (i + 1) * 10 }).eq("id", id)
    )
  );

  // 3) Recalcular estado de los sprints afectados.
  for (const sid of affected) await syncSprintStatus(supabase, sid);

  revalidatePath("/backlog");
  revalidatePath("/sprints");
  clearReadCache();
  return { ok: true };
}

export async function removeFromSprint(sprintId: string, requirementId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("sprint_requirements")
    .delete()
    .eq("sprint_id", sprintId)
    .eq("requirement_id", requirementId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/sprints/${sprintId}`);
  clearReadCache();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Horas
// ---------------------------------------------------------------------------
export async function addTimeEntry(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const schema = z.object({
    entry_date: z.string().min(1),
    hours: z.coerce.number().positive("Las horas deben ser mayores a 0"),
    requirement_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
    sprint_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
    description: z.preprocess(emptyToNull, z.string().nullable()),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { error } = await supabase
    .from("time_entries")
    .insert({ ...parsed.data, project_id: await getProjectId(), created_by: uid });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/horas");
  revalidatePath("/");
  if (parsed.data.requirement_id) revalidatePath(`/tracking/${parsed.data.requirement_id}`);
  clearReadCache();
  return { ok: true };
}

/** Carga rápida de horas (usada al finalizar un requerimiento). */
export async function quickLogHours(
  requirementId: string,
  sprintId: string | null,
  hours: number,
  description?: string
) {
  if (!hours || hours <= 0) return { ok: false, error: "Ingresá las horas reales" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { error } = await supabase.from("time_entries").insert({
    project_id: await getProjectId(),
    requirement_id: requirementId,
    sprint_id: sprintId,
    entry_date: new Date().toISOString().slice(0, 10),
    hours,
    description: description ?? null,
    created_by: uid,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/backlog");
  revalidatePath("/sprints");
  revalidatePath("/horas");
  revalidatePath("/");
  revalidatePath(`/tracking/${requirementId}`);
  clearReadCache();
  return { ok: true };
}

export async function addContractedHours(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const schema = z.object({
    entry_date: z.string().min(1),
    hours: z.coerce.number().positive("Las horas deben ser mayores a 0"),
    note: z.preprocess(emptyToNull, z.string().nullable()),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { error } = await supabase
    .from("contracted_hours")
    .insert({ ...parsed.data, project_id: await getProjectId(), created_by: uid });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/horas");
  revalidatePath("/");
  clearReadCache();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Eliminaciones
// ---------------------------------------------------------------------------
export async function deleteRequirement(id: string) {
  const supabase = createClient();
  const uid = await currentProfileId();
  // Soft-delete para preservar historial; se saca de los sprints.
  const { data: prevLinks } = await supabase.from("sprint_requirements").select("sprint_id").eq("requirement_id", id);
  await supabase.from("sprint_requirements").delete().eq("requirement_id", id);
  const { error } = await supabase
    .from("requirements")
    .update({ archived_at: new Date().toISOString(), updated_by: uid })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  for (const l of (prevLinks ?? []) as any[]) await syncSprintStatus(supabase, l.sprint_id);
  revalidatePath("/backlog");
  revalidatePath("/sprints");
  revalidatePath("/tracking");
  clearReadCache();
  return { ok: true };
}

export async function archiveSprint(id: string, archived: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("sprints")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearReadCache();
  revalidatePath("/sprints");
  revalidatePath("/backlog");
  return { ok: true };
}

export async function toggleContractedFlag(id: string, field: "invoiced" | "paid", value: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("contracted_hours").update({ [field]: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearReadCache();
  revalidatePath("/facturacion");
  return { ok: true };
}

export async function deleteSprint(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("sprints").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sprints");
  revalidatePath("/backlog");
  clearReadCache();
  return { ok: true };
}

export async function deleteTimeEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/horas");
  revalidatePath("/");
  clearReadCache();
  return { ok: true };
}

export async function deleteContractedHours(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("contracted_hours").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/horas");
  revalidatePath("/");
  clearReadCache();
  return { ok: true };
}

export async function deleteRequirementNote(id: string, requirementId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("requirement_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/tracking/${requirementId}`);
  clearReadCache();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Responsables (people)
// ---------------------------------------------------------------------------
export async function upsertPerson(payload: { id?: string; name: string; role?: string }) {
  const name = payload.name?.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  const supabase = createClient();
  const values = { name, role: payload.role?.trim() || null };
  if (payload.id) {
    const { error } = await supabase.from("people").update(values).eq("id", payload.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const projectId = await getProjectId();
    const { data } = await supabase.from("people").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1);
    const sort_order = Number((data?.[0] as any)?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("people").insert({ ...values, project_id: projectId, sort_order });
    if (error) return { ok: false, error: error.message };
  }
  clearReadCache();
  revalidatePath("/configuracion");
  revalidatePath("/backlog");
  return { ok: true };
}

export async function deletePerson(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearReadCache();
  revalidatePath("/configuracion");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------
export async function quickAddTask(title: string) {
  const t = title.trim();
  if (!t) return { ok: false, error: "Escribí un tema" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const { error } = await supabase.from("tasks").insert({ project_id: await getProjectId(), title: t, created_by: uid });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tareas");
  return { ok: true };
}

export async function saveTask(payload: {
  id?: string; title: string; detail?: string; assignee?: string; label?: string; due_date?: string | null;
}) {
  const title = payload.title?.trim();
  if (!title) return { ok: false, error: "El tema es obligatorio" };
  const supabase = createClient();
  const uid = await currentProfileId();
  const values = {
    title,
    detail: payload.detail?.trim() || null,
    assignee: payload.assignee?.trim() || null,
    label: payload.label?.trim() || null,
    due_date: payload.due_date || null,
  };
  if (payload.id) {
    const { error } = await supabase.from("tasks").update(values).eq("id", payload.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("tasks").insert({ ...values, project_id: await getProjectId(), created_by: uid });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/tareas");
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tareas");
  return { ok: true };
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tareas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar bloque de horas contratadas
// ---------------------------------------------------------------------------
export async function updateContractedHours(id: string, payload: { entry_date: string; hours: number; note?: string }) {
  if (!payload.hours || payload.hours <= 0) return { ok: false, error: "Las horas deben ser mayores a 0" };
  const supabase = createClient();
  const { error } = await supabase
    .from("contracted_hours")
    .update({ entry_date: payload.entry_date, hours: payload.hours, note: payload.note?.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearReadCache();
  revalidatePath("/horas");
  revalidatePath("/facturacion");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
