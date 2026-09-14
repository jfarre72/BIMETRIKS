"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_ID } from "@/lib/constants";

export type CatalogKind = "areas" | "req_statuses" | "req_priorities" | "req_types";

const TABLES: Record<CatalogKind, string> = {
  areas: "areas",
  req_statuses: "req_statuses",
  req_priorities: "req_priorities",
  req_types: "req_types",
};

function revalidateAll() {
  revalidatePath("/configuracion");
  revalidatePath("/backlog");
  revalidatePath("/");
}

export type CatalogResult = { ok: boolean; error?: string };

export async function upsertCatalogItem(
  kind: CatalogKind,
  payload: { id?: string; name: string; color?: string; is_final?: boolean }
): Promise<CatalogResult> {
  const name = payload.name?.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  const supabase = createClient();
  const table = TABLES[kind];

  const values: Record<string, unknown> = { name };
  if (kind !== "areas") values.color = payload.color ?? "#64748B";
  if (kind === "req_statuses") values.is_final = payload.is_final ?? false;

  if (payload.id) {
    const { error } = await supabase.from(table).update(values).eq("id", payload.id);
    if (error) return { ok: false, error: error.message };
  } else {
    // sort_order / weight = al final
    if (kind === "areas" || kind === "req_statuses") {
      const { data } = await supabase
        .from(table)
        .select("sort_order")
        .eq("project_id", PROJECT_ID)
        .order("sort_order", { ascending: false })
        .limit(1);
      values.sort_order = ((data?.[0] as any)?.sort_order ?? 0) + 1;
    }
    if (kind === "req_priorities") {
      const { data } = await supabase
        .from(table)
        .select("weight")
        .eq("project_id", PROJECT_ID)
        .order("weight", { ascending: false })
        .limit(1);
      values.weight = ((data?.[0] as any)?.weight ?? 0) + 1;
    }
    const { error } = await supabase.from(table).insert({ ...values, project_id: PROJECT_ID });
    if (error) return { ok: false, error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<CatalogResult> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES[kind]).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Reordena intercambiando el orden con el item vecino (arriba/abajo). */
export async function moveCatalogItem(
  kind: CatalogKind,
  a: { id: string; order: number },
  b: { id: string; order: number }
): Promise<CatalogResult> {
  const supabase = createClient();
  const table = TABLES[kind];
  const field = kind === "req_priorities" ? "weight" : "sort_order";
  const { error: e1 } = await supabase.from(table).update({ [field]: b.order }).eq("id", a.id);
  const { error: e2 } = await supabase.from(table).update({ [field]: a.order }).eq("id", b.id);
  if (e1 || e2) return { ok: false, error: (e1 ?? e2)?.message };
  revalidateAll();
  return { ok: true };
}
