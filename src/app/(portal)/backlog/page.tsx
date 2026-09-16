import { getRequirements, getCatalogs, getSprints, getArchivedSprintIds, getCurrentProfile } from "@/lib/queries";
import { isStaffRole } from "@/lib/auth";
import { BacklogClient } from "./backlog-client";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const [requirements, catalogs, sprints, archivedIds, profile] = await Promise.all([
    getRequirements(),
    getCatalogs(),
    getSprints(),
    getArchivedSprintIds(),
    getCurrentProfile(),
  ]);
  // No mostramos requerimientos que estén en sprints archivados.
  const archived = new Set(archivedIds);
  const visible = requirements.filter((r) => !(r.sprint?.id && archived.has(r.sprint.id)));
  // Sprints más antiguos primero (Sprint 1, 2, ...); "Sin asignar" lo agrega el board.
  const ordered = [...sprints].reverse();
  const canManage = isStaffRole(profile?.role);
  return <BacklogClient requirements={visible} sprints={ordered} catalogs={catalogs} canManage={canManage} />;
}
