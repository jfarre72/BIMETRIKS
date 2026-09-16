import { getTasks, getPeople, getCurrentProfile } from "@/lib/queries";
import { isStaffRole } from "@/lib/auth";
import { TareasClient } from "./tareas-client";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const [tasks, people, profile] = await Promise.all([getTasks(), getPeople(), getCurrentProfile()]);
  return (
    <TareasClient
      tasks={tasks as any}
      people={(people as any[]).map((p) => p.name)}
      canManage={isStaffRole(profile?.role)}
    />
  );
}
