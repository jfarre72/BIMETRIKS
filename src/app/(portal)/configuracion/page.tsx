import { createClient } from "@/lib/supabase/server";
import { getProjectId } from "@/lib/project";
import { requireStaff } from "@/lib/auth";
import { ConfigClient, type CatalogRow } from "./config-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  await requireStaff();
  const supabase = createClient();
  const PROJECT_ID = await getProjectId();
  const [areas, statuses, priorities, types, people, dashboards] = await Promise.all([
    supabase.from("areas").select("id,name,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_statuses").select("id,name,color,is_final,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
    supabase.from("req_priorities").select("id,name,color,weight").eq("project_id", PROJECT_ID).order("weight", { ascending: false }),
    supabase.from("req_types").select("id,name,color").eq("project_id", PROJECT_ID).order("name"),
    supabase.from("people").select("id,name,role").eq("project_id", PROJECT_ID).order("sort_order").order("name"),
    supabase.from("dashboards").select("id,name,sort_order").eq("project_id", PROJECT_ID).order("sort_order"),
  ]);

  const map = (rows: any[], orderField?: string): CatalogRow[] =>
    (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      is_final: r.is_final,
      order: orderField ? Number(r[orderField] ?? 0) : 0,
    }));

  return (
    <ConfigClient
      data={{
        areas: map(areas.data ?? [], "sort_order"),
        req_statuses: map(statuses.data ?? [], "sort_order"),
        req_priorities: map(priorities.data ?? [], "weight"),
        req_types: map(types.data ?? []),
        dashboards: map(dashboards.data ?? [], "sort_order"),
      }}
      people={(people.data as any) ?? []}
    />
  );
}
