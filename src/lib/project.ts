import { createClient } from "@/lib/supabase/server";

// Memo en memoria del proceso: el proyecto no cambia, así que se resuelve una
// sola vez por instancia serverless (evita una consulta extra en cada request).
let cachedProjectId: string | null = null;

/**
 * Resuelve el proyecto activo dinámicamente (el más antiguo). En el MVP hay uno
 * solo; cuando crezca a multi-proyecto esto se reemplaza por la selección del
 * usuario. El ID deja de estar hardcodeado.
 */
export async function getProjectId(): Promise<string> {
  if (cachedProjectId) return cachedProjectId;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error("No hay ningún proyecto cargado en la base.");
  }
  cachedProjectId = data.id as string;
  return cachedProjectId;
}
