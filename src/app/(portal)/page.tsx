import { Clock, TrendingUp, ListChecks, Layers, Inbox } from "lucide-react";
import { getDashboard } from "@/lib/queries";
import { formatHours, pct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { HoursDonut } from "@/components/dashboard/hours-donut";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { HourBlocksChart } from "@/components/dashboard/hour-blocks-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { hours, requirements, blocks } = await getDashboard();
  const byStatus = groupByStatus(requirements);

  const totalReqs = requirements.length;
  const assignedReqs = requirements.filter((r) => r.sprint?.id).length;
  const unassignedReqs = totalReqs - assignedReqs;

  return (
    <div>
      <PageHeader title="Inicio" subtitle="Estado general del servicio" />

      {/* KPIs de horas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Horas contratadas" value={formatHours(hours.contracted)} icon={<Clock size={18} />} accent="#0B1E3F" />
        <StatCard label="Horas utilizadas" value={formatHours(hours.consumed)} icon={<TrendingUp size={18} />} accent="#1E5EFF" />
        <StatCard label="Horas disponibles" value={formatHours(hours.available)} icon={<Clock size={18} />} accent="#16A34A" />
        <StatCard label="% utilizado" value={`${pct(hours.consumed, hours.contracted)}%`} icon={<TrendingUp size={18} />} accent="#4E9A2E" />
      </div>

      {/* Indicadores de requerimientos */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Requerimientos totales" value={totalReqs} icon={<ListChecks size={18} />} accent="#0B1E3F" />
        <StatCard label="Asignados a sprint" value={assignedReqs} hint={`${pct(assignedReqs, totalReqs)}% del total`} icon={<Layers size={18} />} accent="#1E5EFF" />
        <StatCard label="Pendientes de asignar" value={unassignedReqs} hint={`${pct(unassignedReqs, totalReqs)}% del total`} icon={<Inbox size={18} />} accent="#CA8A04" />
      </div>

      {/* Torta de utilización + torta de estados */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HoursDonut consumed={hours.consumed} available={hours.available} />
        <StatusDonut data={byStatus} total={requirements.length} />
      </div>

      {/* Horas por bloque */}
      <div className="mt-4">
        <HourBlocksChart blocks={blocks} />
      </div>
    </div>
  );
}

function groupByStatus(reqs: any[]) {
  const map = new Map<string, { name: string; color: string; value: number; order: number }>();
  reqs.forEach((r) => {
    const name = r.status?.name ?? "Sin estado";
    const color = r.status?.color ?? "#94A3B8";
    const order = r.status?.sort_order ?? 99;
    const cur = map.get(name) ?? { name, color, value: 0, order };
    cur.value += 1;
    map.set(name, cur);
  });
  return [...map.values()].sort((a, b) => a.order - b.order);
}
