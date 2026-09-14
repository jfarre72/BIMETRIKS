import { getRequirements, getCatalogs } from "@/lib/queries";
import { BacklogClient } from "./backlog-client";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const [requirements, catalogs] = await Promise.all([getRequirements(), getCatalogs()]);
  return <BacklogClient requirements={requirements} catalogs={catalogs} />;
}
