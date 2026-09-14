import { getProjectHours, getContractedHours, getTimeEntries, getCatalogs } from "@/lib/queries";
import { getRequirements } from "@/lib/queries";
import { HorasClient } from "./horas-client";

export const dynamic = "force-dynamic";

export default async function HorasPage() {
  const [hours, contracted, entries, requirements, catalogs] = await Promise.all([
    getProjectHours(),
    getContractedHours(),
    getTimeEntries(200),
    getRequirements(),
    getCatalogs(),
  ]);
  return (
    <HorasClient
      hours={hours}
      contracted={contracted}
      entries={entries}
      requirements={requirements.map((r) => ({ id: r.id, code: r.code, title: r.title }))}
      sprints={catalogs.sprints}
    />
  );
}
