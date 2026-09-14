import { getSprints, getRequirements, getCatalogs, getArchivedSprints } from "@/lib/queries";
import { SprintsClient } from "./sprints-client";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const [sprints, requirements, catalogs, archived] = await Promise.all([
    getSprints(),
    getRequirements(),
    getCatalogs(),
    getArchivedSprints(),
  ]);
  const ordered = [...sprints].reverse();
  return (
    <SprintsClient sprints={ordered} requirements={requirements} statuses={catalogs.statuses} archived={archived} />
  );
}
