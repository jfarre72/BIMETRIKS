import { getRequirements } from "@/lib/queries";
import { TrackingSelector } from "./tracking-selector";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const requirements = await getRequirements();
  return <TrackingSelector requirements={requirements} />;
}
