"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/project";
import { getCurrentProfile } from "@/lib/queries";
import { isStaffRole } from "@/lib/auth";

export type ClientActionResult = { ok: boolean; error?: string; projectId?: string };

/** Staff: cambia el cliente/proyecto que está mirando (selector del sidebar). */
export async function setActiveProject(projectId: string): Promise<ClientActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) return { ok: false, error: "Sin permisos" };
  const supabase = createClient();
  const { data } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!data) return { ok: false, error: "Proyecto inexistente" };
  cookies().set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Staff: alta de cliente + proyecto (copia estados/prioridades/tipos del
 * primer proyecto). Deja seleccionado el cliente nuevo.
 */
export async function createClientProject(payload: { clientName: string; projectName?: string }): Promise<ClientActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) return { ok: false, error: "Sin permisos" };
  const clientName = payload.clientName?.trim();
  if (!clientName) return { ok: false, error: "El nombre del cliente es obligatorio" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_client_project", {
    p_client_name: clientName,
    p_project_name: payload.projectName?.trim() || "Servicio Data & Analytics",
  });
  if (error) return { ok: false, error: error.message };
  return setActiveProject(data as string).then((r) => ({ ...r, projectId: data as string }));
}
