import { Clock, TrendingUp, ListChecks, Layers, Inbox } from "lucide-react";
import { getDashboard, getCatalogs } from "@/lib/queries";
import { formatHours, pct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusFlow } from "@/components/dashboard/status-flow";
import { HourBlocksChart } from "@/components/dashboard/hour-blocks-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ hours, requirements, blocks }, catalogs] = await Promise.all([getDashboard(), getCatalogs()]);
  const byStatus = groupByStatus(requirements, catalogs.statuses);

  const totalReqs = requirements.length;
  const assignedReqs = requirements.filter((r) => r.sprint?.id).length;
  const unassignedReqs = totalReqs - assignedReqs;

  return (
    <div>
      <PageHeader title="Inicio" subtitle="Estado general del servicio" />

      {/* KPIs de horas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Horas contratadas" value={formatHours(hours.contracted)} icon={<Clock size={16} />} accent="#0B1E3F" />
        <StatCard compact label="Horas utilizadas" value={formatHours(hours.consumed)} icon={<TrendingUp size={16} />} accent="#1E5EFF" />
        <StatCard compact label="Horas disponibles" value={formatHours(hours.available)} icon={<Clock size={16} />} accent="#16A34A" />
        <StatCard compact label="% utilizado" value={`${pct(hours.consumed, hours.contracted)}%`} icon={<TrendingUp size={16} />} accent="#4E9A2E" />
      </div>

      {/* Indicadores de requerimientos */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard compact label="Requerimientos totales" value={totalReqs} icon={<ListChecks size={16} />} accent="#0B1E3F" />
        <StatCard compact label="Asignados a sprint" value={assignedReqs} hint={`${pct(assignedReqs, totalReqs)}% del total`} icon={<Layers size={16} />} accent="#1E5EFF" />
        <StatCard compact label="Pendientes de asignar" value={unassignedReqs} hint={`${pct(unassignedReqs, totalReqs)}% del total`} icon={<Inbox size={16} />} accent="#CA8A04" />
      </div>

      {/* Flujo de requerimientos por estado (a todo el ancho) */}
      <div className="mt-3">
        <StatusFlow data={byStatus} total={requirements.length} />
      </div>

      {/* Horas por bloque */}
      <div className="mt-3">
        <HourBlocksChart blocks={blocks} />
      </div>
    </div>
  );
}

/**
 * Arma el flujo mostrando TODOS los estados configurados (aunque tengan 0
 * requerimientos) en el orden definido en Configuración (sort_order). Si hay
 * requerimientos sin estado, se agregan al final en un bucket "Sin estado".
 */
function groupByStatus(reqs: any[], statuses: any[]) {
  const counts = new Map<string, number>();
  let noStatus = 0;
  reqs.forEach((r) => {
    const id = r.status?.id ?? r.status_id ?? null;
    if (!id) noStatus += 1;
    else counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  const ordered = [...statuses]
    .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    .map((s) => ({ name: s.name, color: s.color ?? "#94A3B8", value: counts.get(s.id) ?? 0 }));

  if (noStatus > 0) ordered.push({ name: "Sin estado", color: "#94A3B8", value: noStatus });
  return ordered;
}
