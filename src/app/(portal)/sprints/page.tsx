import { getSprints } from "@/lib/queries";
import { SprintsClient } from "./sprints-client";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const sprints = await getSprints();
  return <SprintsClient sprints={sprints} />;
}
