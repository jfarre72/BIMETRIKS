import { getProjectHours, getRequirements, getSprints, getTimeEntries } from "@/lib/queries";
import { ReporteriaClient } from "./reporteria-client";

export const dynamic = "force-dynamic";

export default async function ReporteriaPage() {
  const [hours, requirements, sprints, entries] = await Promise.all([
    getProjectHours(),
    getRequirements(),
    getSprints(),
    getTimeEntries(500),
  ]);

  // Requerimientos por estado
  const byStatusMap = new Map<string, { name: string; color: string; value: number }>();
  requirements.forEach((r) => {
    const name = r.status?.name ?? "Sin estado";
    const cur = byStatusMap.get(name) ?? { name, color: r.status?.color ?? "#94A3B8", value: 0 };
    cur.value += 1;
    byStatusMap.set(name, cur);
  });

  // Requerimientos por área
  const byAreaMap = new Map<string, number>();
  requirements.forEach((r) => {
    const name = r.area?.name ?? "Sin área";
    byAreaMap.set(name, (byAreaMap.get(name) ?? 0) + 1);
  });

  // Evolución acumulada del consumo de horas
  const sorted = [...entries].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
  let acc = 0;
  const evolution = sorted.map((e) => {
    acc += Number(e.hours);
    return { date: e.entry_date, acumulado: Number(acc.toFixed(1)) };
  });

  // Horas por sprint (estimadas vs consumidas)
  const bySprint = sprints.map((s) => ({
    name: s.name.length > 16 ? s.name.slice(0, 16) + "…" : s.name,
    estimadas: Number(s.estimated_hours ?? 0),
    consumidas: Number(s.consumed_hours ?? 0),
  }));

  const finalized = requirements.filter((r) => r.status?.is_final).length;
  const pending = requirements.length - finalized;

  return (
    <ReporteriaClient
      hours={hours}
      byStatus={[...byStatusMap.values()]}
      byArea={[...byAreaMap.entries()].map(([name, value]) => ({ name, value }))}
      evolution={evolution}
      bySprint={bySprint}
      totals={{ total: requirements.length, finalized, pending }}
    />
  );
}
