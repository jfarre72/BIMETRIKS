"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Layers, Calendar, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, CardBody, ProgressBar, EmptyState } from "@/components/ui";
import { SprintStatusBadge } from "@/components/shared/sprint-status";
import { formatHours, formatDate, pct } from "@/lib/utils";
import type { Sprint } from "@/lib/types";
import { SprintForm } from "./sprint-form";

export function SprintsClient({ sprints }: { sprints: Sprint[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Sprints"
        subtitle="Bloques de trabajo"
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> Nuevo sprint</Button>}
      />

      {sprints.length === 0 ? (
        <EmptyState
          title="Aún no hay sprints"
          description="Creá un sprint y luego asigná requerimientos desde el Backlog."
          icon={<Layers size={28} />}
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Nuevo sprint</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sprints.map((s) => {
            const progress = pct(s.consumed_hours ?? 0, s.estimated_hours ?? 0);
            return (
              <Card key={s.id} className="transition-shadow hover:shadow-float">
                <CardBody>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <Link href={`/sprints/${s.id}`} className="text-base font-semibold text-ink hover:text-brand">
                        {s.name}
                      </Link>
                      {s.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{s.description}</p>}
                    </div>
                    <SprintStatusBadge status={s.status} />
                  </div>

                  <div className="mb-3 flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Layers size={13} /> {s.requirement_count} reqs</span>
                    {s.target_date && <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(s.target_date)}</span>}
                  </div>

                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted">Estimado</span>
                    <span className="tabular font-medium">{formatHours(s.estimated_hours)}</span>
                  </div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted">Consumido</span>
                    <span className="tabular font-medium">{formatHours(s.consumed_hours)}</span>
                  </div>
                  <ProgressBar value={progress} />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted">{progress}% avance</span>
                    <Link href={`/sprints/${s.id}`} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                      Ver detalle <ArrowRight size={13} />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <SprintForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
