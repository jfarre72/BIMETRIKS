import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRequirement, getRequirementNotes, getAttachments, getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";
import { PriorityBadge, TypeBadge } from "@/components/shared/req-badges";
import { StatusSelect } from "@/components/shared/status-select";
import { AttachmentUploader } from "@/components/shared/attachment-uploader";
import { formatHours, formatDate } from "@/lib/utils";
import { Timeline } from "./timeline";
import { EditRequirementButton } from "./edit-requirement";

export const dynamic = "force-dynamic";

export default async function RequirementDetailPage({ params }: { params: { id: string } }) {
  const requirement = await getRequirement(params.id);
  if (!requirement) notFound();
  const [notes, attachments, catalogs] = await Promise.all([
    getRequirementNotes(params.id),
    getAttachments(params.id),
    getCatalogs(),
  ]);

  const meta: [string, React.ReactNode][] = [
    ["Área", requirement.area?.name ?? "—"],
    ["Tipo", requirement.type ? <TypeBadge type={requirement.type} /> : "—"],
    ["Prioridad", <PriorityBadge key="p" priority={requirement.priority} />],
    ["Estado", <StatusSelect key="s" requirementId={requirement.id} value={requirement.status_id} statuses={catalogs.statuses} sprintId={requirement.sprint?.id ?? null} estimatedHours={Number(requirement.estimated_hours ?? 0)} />],
    ["Responsable", requirement.assignee?.name ?? "—"],
    ["Validación", requirement.validator?.name ?? "—"],
    ["Sprint", requirement.sprint?.name ?? "—"],
    ["Módulo", requirement.module ?? "—"],
    ["Horas estimadas", formatHours(requirement.estimated_hours)],
    ["Horas utilizadas", formatHours(requirement.consumed_hours)],
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
        actions={<EditRequirementButton catalogs={catalogs} requirement={requirement} />}
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
