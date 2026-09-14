import { getSprints, getRequirements, getCatalogs } from "@/lib/queries";
import { SprintsClient } from "./sprints-client";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const [sprints, requirements, catalogs] = await Promise.all([
    getSprints(),
    getRequirements(),
    getCatalogs(),
  ]);
  // Sprint 1 primero, Sprint 2 segundo, etc.
  const ordered = [...sprints].reverse();
  return <SprintsClient sprints={ordered} requirements={requirements} statuses={catalogs.statuses} />;
}
