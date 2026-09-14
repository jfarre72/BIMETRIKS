import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Resuelve el proyecto activo dinámicamente (el más antiguo).
 * En el MVP hay uno solo; cuando crezca a multi-proyecto, esto se reemplaza
 * por la selección del usuario. El ID del proyecto deja de estar hardcodeado.
 * `cache` evita repetir la consulta dentro del mismo request.
 */
export const getProjectId = cache(async (): Promise<string> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(
      "No hay ningún proyecto cargado. Creá el proyecto inicial en la base antes de usar la app."
    );
  }
  return data.id as string;
});
