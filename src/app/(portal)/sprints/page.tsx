import { getSprints, getRequirements, getCatalogs, getArchivedSprints, getCurrentProfile } from "@/lib/queries";
import { isStaffRole } from "@/lib/auth";
import { SprintsClient } from "./sprints-client";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const [sprints, requirements, catalogs, archived, profile] = await Promise.all([
    getSprints(),
    getRequirements(),
    getCatalogs(),
    getArchivedSprints(),
    getCurrentProfile(),
  ]);
  const ordered = [...sprints].reverse();
  return (
    <SprintsClient sprints={ordered} requirements={requirements} statuses={catalogs.statuses} archived={archived} canManage={isStaffRole(profile?.role)} />
  );
}
