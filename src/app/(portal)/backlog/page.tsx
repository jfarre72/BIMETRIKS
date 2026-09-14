import { getRequirements, getCatalogs, getSprints } from "@/lib/queries";
import { BacklogClient } from "./backlog-client";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const [requirements, catalogs, sprints] = await Promise.all([
    getRequirements(),
    getCatalogs(),
    getSprints(),
  ]);
  // Sprints más antiguos primero (Sprint 1, 2, ...); "Sin asignar" lo agrega el board al final.
  const ordered = [...sprints].reverse();
  return <BacklogClient requirements={requirements} sprints={ordered} catalogs={catalogs} />;
}
