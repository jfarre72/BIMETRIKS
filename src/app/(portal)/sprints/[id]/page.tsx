import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Layers } from "lucide-react";
import { getSprint, getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle, ProgressBar, EmptyState, Badge } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { SprintStatusBadge } from "@/components/shared/sprint-status";
import { PriorityBadge } from "@/components/shared/req-badges";
import { StatusSelect } from "@/components/shared/status-select";
import { formatHours, formatDate, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SprintDetailPage({ params }: { params: { id: string } }) {
  const [{ sprint, requirements }, catalogs] = await Promise.all([getSprint(params.id), getCatalogs()]);
  if (!sprint) notFound();

  const progress = pct(sprint.consumed_hours ?? 0, sprint.estimated_hours ?? 0);

  return (
    <div>
      <Link href="/sprints" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Volver a Sprints
      </Link>

      <PageHeader
        title={sprint.name}
        subtitle={sprint.description ?? undefined}
        actions={<SprintStatusBadge status={sprint.status} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requerimientos" value={requirements.length} icon={<Layers size={18} />} />
        <StatCard label="Horas estimadas" value={formatHours(sprint.estimated_hours)} accent="#0B1E3F" />
        <StatCard label="Horas consumidas" value={formatHours(sprint.consumed_hours)} accent="#1E5EFF" />
        <StatCard label="% avance" value={`${progress}%`} accent="#16A34A" />
      </div>

      <Card className="mb-4 p-5">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="flex items-center gap-4 text-muted">
            <span className="flex items-center gap-1"><Calendar size={14} /> Inicio: {formatDate(sprint.start_date)}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> Objetivo: {formatDate(sprint.target_date)}</span>
          </span>
          <span className="tabular font-medium">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requerimientos del sprint</CardTitle>
          <Badge>{requirements.length}</Badge>
        </CardHeader>
        <CardBody>
          {requirements.length === 0 ? (
            <EmptyState
              title="Sin requerimientos"
              description="Asigná requerimientos a este sprint desde el Backlog (seleccioná y «Asignar a Sprint»)."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">ID</th>
                    <th className="px-3 py-2">Título</th>
                    <th className="px-3 py-2">Prioridad</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-right">Est.</th>
                    <th className="px-3 py-2 text-right">Cons.</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-brand">
                        <Link href={`/tracking/${r.id}`} className="hover:underline">{r.code}</Link>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-ink">{r.title}</td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-3 py-2.5"><StatusSelect requirementId={r.id} value={r.status_id} statuses={catalogs.statuses} sprintId={sprint.id} /></td>
                      <td className="px-3 py-2.5 text-right tabular text-muted">{formatHours(r.estimated_hours)}</td>
                      <td className="px-3 py-2.5 text-right tabular font-medium">{formatHours(r.consumed_hours)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line font-semibold">
                    <td colSpan={4} className="py-2.5 text-right text-muted">Total</td>
                    <td className="px-3 py-2.5 text-right tabular">{formatHours(sprint.estimated_hours)}</td>
                    <td className="px-3 py-2.5 text-right tabular">{formatHours(sprint.consumed_hours)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
