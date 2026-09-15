import { getProjectHours, getRequirements, getSprints, getTimeEntries, getHourBlocks, getClientName } from "@/lib/queries";
import { ReporteriaClient } from "./reporteria-client";
import type { ReportReq, SprintReport } from "./report-pdf";

export const dynamic = "force-dynamic";

export default async function ReporteriaPage() {
  const [hours, requirements, sprints, entries, blocks, clientName] = await Promise.all([
    getProjectHours(),
    getRequirements(),
    getSprints(),
    getTimeEntries(500),
    getHourBlocks(),
    getClientName(),
  ]);

  const reportReqs: ReportReq[] = requirements.map((r) => ({
    code: r.code,
    title: r.title,
    area: r.area?.name ?? "—",
    status: r.status?.name ?? "Sin estado",
    statusColor: r.status?.color ?? "#94A3B8",
    estimated: Number(r.estimated_hours ?? 0),
    consumed: Number(r.consumed_hours ?? 0),
    sprint: r.sprint?.name ?? "—",
    updatedAt: r.updated_at,
  }));

  // Detalle por sprint: cada sprint con sus requerimientos y estados.
  const bySprintGroups = new Map<string, SprintReport>();
  sprints.forEach((s) =>
    bySprintGroups.set(s.id, { name: s.name, status: s.status, estimated: 0, consumed: 0, requirements: [] })
  );
  const unassigned: SprintReport = { name: "Sin asignar", status: null, estimated: 0, consumed: 0, requirements: [] };
  requirements.forEach((r) => {
    const group = (r.sprint?.id && bySprintGroups.get(r.sprint.id)) || unassigned;
    group.requirements.push({
      code: r.code,
      title: r.title,
      status: r.status?.name ?? "Sin estado",
      statusColor: r.status?.color ?? "#94A3B8",
      estimated: Number(r.estimated_hours ?? 0),
      consumed: Number(r.consumed_hours ?? 0),
    });
    group.estimated += Number(r.estimated_hours ?? 0);
    group.consumed += Number(r.consumed_hours ?? 0);
  });
  const sprintReport: SprintReport[] = [...bySprintGroups.values()].filter((g) => g.requirements.length > 0);
  if (unassigned.requirements.length > 0) sprintReport.push(unassigned);

  // Requerimientos por estado
  const byStatusMap = new Map<string, { name: string; color: string; value: number }>();
  requirements.forEach((r) => {
    const name = r.status?.name ?? "Sin estado";
    const cur = byStatusMap.get(name) ?? { name, color: r.status?.color ?? "#94A3B8", value: 0 };
    cur.value += 1;
    byStatusMap.set(name, cur);
  });

  // Evolución acumulada del consumo de horas
  const sorted = [...entries].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
  let acc = 0;
  const evolution = sorted.map((e) => {
    acc += Number(e.hours);
    return { date: e.entry_date, acumulado: Number(acc.toFixed(1)) };
  });

  const finalized = requirements.filter((r) => r.status?.is_final).length;
  const pending = requirements.length - finalized;

  return (
    <ReporteriaClient
      hours={hours}
      byStatus={[...byStatusMap.values()]}
      evolution={evolution}
      blocks={blocks}
      totals={{ total: requirements.length, finalized, pending }}
      clientName={clientName}
      reportReqs={reportReqs}
      sprintReport={sprintReport}
    />
  );
}
