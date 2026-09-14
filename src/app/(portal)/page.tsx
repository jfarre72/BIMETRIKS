import Link from "next/link";
import { Clock, TrendingUp, Layers } from "lucide-react";
import { getDashboard } from "@/lib/queries";
import { formatHours, pct, formatDateShort } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle, ProgressBar, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { HoursGauge } from "@/components/dashboard/hours-gauge";
import { StatusDonut } from "@/components/dashboard/status-donut";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { hours, requirements, activeSprint, recentNotes, recentEntries } = await getDashboard();
  const byStatus = groupByStatus(requirements);

  return (
    <div>
      <PageHeader title="Inicio" subtitle="Estado general del servicio" />

      {/* KPIs de horas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Horas contratadas" value={formatHours(hours.contracted)} icon={<Clock size={18} />} accent="#0B1E3F" />
        <StatCard label="Horas consumidas" value={formatHours(hours.consumed)} icon={<TrendingUp size={18} />} accent="#1E5EFF" />
        <StatCard label="Horas disponibles" value={formatHours(hours.available)} icon={<Clock size={18} />} accent="#16A34A" />
        <StatCard label="% utilizado" value={`${pct(hours.consumed, hours.contracted)}%`} icon={<TrendingUp size={18} />} accent="#4FB2F0" />
      </div>

      {/* Consumo de horas + torta de estados (a la derecha) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HoursGauge contracted={hours.contracted} consumed={hours.consumed} available={hours.available} />
        </div>
        <StatusDonut data={byStatus} total={requirements.length} />
      </div>

      {/* Sprint activo + últimos movimientos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Sprint activo</CardTitle>
            <Layers size={16} className="text-muted" />
          </CardHeader>
          <CardBody>
            {activeSprint ? (
              <div>
                <Link href={`/sprints/${activeSprint.id}`} className="text-sm font-semibold text-ink hover:text-brand">
                  {activeSprint.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted">{activeSprint.requirement_count} requerimientos</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Estimadas</span><span className="tabular font-medium">{formatHours(activeSprint.estimated_hours)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Consumidas</span><span className="tabular font-medium">{formatHours(activeSprint.consumed_hours)}</span></div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={pct(activeSprint.consumed_hours ?? 0, activeSprint.estimated_hours ?? 0)} />
                  <p className="mt-1 text-right text-xs text-muted">
                    {pct(activeSprint.consumed_hours ?? 0, activeSprint.estimated_hours ?? 0)}% avance
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No hay sprint activo.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Últimos movimientos</CardTitle>
          </CardHeader>
          <CardBody>
            <RecentActivity notes={recentNotes} entries={recentEntries} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RecentActivity({ notes, entries }: { notes: any[]; entries: any[] }) {
  const items = [
    ...notes.map((n) => ({ date: n.created_at, text: n.body, tag: n.event_type })),
    ...entries.map((e) => ({
      date: e.entry_date,
      text: e.requirement ? `${e.requirement.code} recibió ${e.hours} h` : `${e.hours} h registradas`,
      tag: "horas",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  if (items.length === 0) {
    return <EmptyState title="Sin movimientos todavía" description="Las notas y cargas de horas aparecerán aquí." />;
  }

  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{it.text}</p>
            <p className="text-xs text-muted">{formatDateShort(it.date)}</p>
          </div>
          <Badge>{it.tag}</Badge>
        </li>
      ))}
    </ul>
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
