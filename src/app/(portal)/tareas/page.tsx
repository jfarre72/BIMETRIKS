import { getTasks, getPeople } from "@/lib/queries";
import { TareasClient } from "./tareas-client";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const [tasks, people] = await Promise.all([getTasks(), getPeople()]);
  return <TareasClient tasks={tasks as any} people={(people as any[]).map((p) => p.name)} />;
}
