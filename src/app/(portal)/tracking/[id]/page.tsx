import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRequirement, getRequirementNotes, getAttachments } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/shared/req-badges";
import { AttachmentUploader } from "@/components/shared/attachment-uploader";
import { formatHours, formatDate } from "@/lib/utils";
import { Timeline } from "./timeline";
import { LogHoursButton } from "./log-hours";

export const dynamic = "force-dynamic";

export default async function RequirementDetailPage({ params }: { params: { id: string } }) {
  const requirement = await getRequirement(params.id);
  if (!requirement) notFound();
  const [notes, attachments] = await Promise.all([
    getRequirementNotes(params.id),
    getAttachments(params.id),
  ]);

  const meta: [string, React.ReactNode][] = [
    ["Área", requirement.area?.name ?? "—"],
    ["Tipo", requirement.type ? <TypeBadge type={requirement.type} /> : "—"],
    ["Prioridad", <PriorityBadge key="p" priority={requirement.priority} />],
    ["Estado", <StatusBadge key="s" status={requirement.status} />],
    ["Responsable", requirement.assignee?.full_name ?? requirement.assignee?.username ?? "—"],
    ["Validación", requirement.validator?.full_name ?? requirement.validator?.username ?? "—"],
    ["Sprint", requirement.sprint?.name ?? "—"],
    ["Módulo", requirement.module ?? "—"],
    ["Horas estimadas", formatHours(requirement.estimated_hours)],
    ["Horas consumidas", formatHours(requirement.consumed_hours)],
    ["Creado", formatDate(requirement.created_at)],
    ["Actualizado", formatDate(requirement.updated_at)],
  ];

  return (
    <div>
      <Link href="/tracking" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Volver a Tracking
      </Link>

      <PageHeader
        title={requirement.title}
        subtitle={requirement.code}
        actions={<LogHoursButton requirementId={requirement.id} sprintId={requirement.sprint?.id} />}
      />

      {/* Encabezado horizontal con los datos del requerimiento */}
      <Card className="mb-4">
        <CardBody>
          {requirement.description && (
            <p className="mb-4 text-sm leading-relaxed text-muted">{requirement.description}</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            {meta.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-wide text-muted">{k}</dt>
                <dd className="mt-1 text-sm text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {requirement.observations && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Observaciones</p>
              <p className="mt-1 text-sm text-ink">{requirement.observations}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Adjuntos */}
      <Card className="mb-4">
        <CardBody>
          <AttachmentUploader requirementId={requirement.id} initial={attachments as any} />
        </CardBody>
      </Card>

      {/* Timeline / notas debajo, a lo ancho */}
      <Card>
        <CardBody>
          <Timeline requirementId={requirement.id} notes={notes} />
        </CardBody>
      </Card>
    </div>
  );
}
