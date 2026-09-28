import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Cookie con el proyecto que eligió el staff en el selector de cliente. */
export const ACTIVE_PROJECT_COOKIE = "bmk_project";

export interface ActiveProject {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  clientName: string;
}

/**
 * Resuelve el proyecto activo del request (memo por request con React.cache):
 *  - CLIENT: el proyecto de su cliente (profiles.client_id). El RLS ya le
 *    impide ver otros, pero igual filtramos explícitamente.
 *  - Staff: el elegido en el selector (cookie); si no hay o ya no existe, el
 *    proyecto más antiguo.
 * No se cachea por instancia: cada usuario puede estar mirando otro cliente.
 */
export const getActiveProject = cache(async (): Promise<ActiveProject> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role,client_id").eq("id", user.id).single()
    : { data: null };

  let query = supabase
    .from("projects")
    .select("id,name,client_id,created_at,client:clients(name)")
    .order("created_at", { ascending: true });
  if ((profile as any)?.role === "CLIENT") {
    query = query.eq("client_id", (profile as any).client_id);
  }
  const { data: projects } = await query;
  const list = (projects ?? []) as any[];
  if (list.length === 0) {
    throw new Error("No hay ningún proyecto disponible para este usuario.");
  }

  const wanted = cookies().get(ACTIVE_PROJECT_COOKIE)?.value;
  const p = list.find((x) => x.id === wanted) ?? list[0];
  return { id: p.id, name: p.name, clientId: p.client_id, clientName: p.client?.name ?? "Cliente" };
});

export async function getProjectId(): Promise<string> {
  return (await getActiveProject()).id;
}

/** Proyectos visibles para el usuario (el RLS acota al CLIENT a los suyos). */
export const listProjects = cache(async (): Promise<ProjectOption[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("id,name,created_at,client:clients(name)")
    .order("created_at", { ascending: true });
  return ((data ?? []) as any[])
    .map((p) => ({ id: p.id, name: p.name, clientName: p.client?.name ?? "Cliente" }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "es", { sensitivity: "base" }));
});
