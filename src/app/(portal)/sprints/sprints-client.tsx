"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Layers, ChevronDown, ChevronRight, Calendar, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, ProgressBar, EmptyState, Badge } from "@/components/ui";
import { deleteSprint, archiveSprint } from "@/lib/actions";
import { SprintStatusBadge } from "@/components/shared/sprint-status";
import { PriorityBadge } from "@/components/shared/req-badges";
import { StatusStepper } from "@/components/shared/status-stepper";
import { formatHours, formatDate, pct } from "@/lib/utils";
import type { Catalogs, Requirement, Sprint } from "@/lib/types";
import { SprintForm } from "./sprint-form";

export function SprintsClient({
  sprints,
  requirements,
  statuses,
  archived = [],
  canManage = true,
}: {
  sprints: Sprint[];
  requirements: Requirement[];
  statuses: Catalogs["statuses"];
  archived?: Sprint[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sprint | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sprints[0] ? [sprints[0].id] : []));

  async function onDeleteSprint(s: Sprint) {
    if (!confirm(`¿Eliminar "${s.name}"? Los requerimientos vuelven a "Sin asignar".`)) return;
    await deleteSprint(s.id);
    router.refresh();
  }
  async function onArchive(s: Sprint, value: boolean) {
    await archiveSprint(s.id, value);
    router.refresh();
  }

  const bySprint = useMemo(() => {
    const map: Record<string, Requirement[]> = {};
    requirements.forEach((r) => {
      if (r.sprint?.id) (map[r.sprint.id] ??= []).push(r);
    });
    return map;
  }, [requirements]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Sprints"
        subtitle="Bloques de trabajo — desplegá para ver y cambiar el estado de cada requerimiento"
        actions={canManage ? <Button onClick={() => setOpen(true)}><Plus size={16} /> Nuevo sprint</Button> : undefined}
      />

      {sprints.length === 0 ? (
        <EmptyState
          title="Aún no hay sprints"
          description="Creá un sprint y luego asigná requerimientos desde el Backlog (arrastrando)."
          icon={<Layers size={28} />}
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Nuevo sprint</Button>}
        />
      ) : (
        <div className="space-y-4">
          {sprints.map((s) => {
            const rows = bySprint[s.id] ?? [];
            const isOpen = expanded.has(s.id);
            const progress = pct(s.consumed_hours ?? 0, s.estimated_hours ?? 0);
            return (
              <Card key={s.id} className="overflow-hidden">
                {/* Cabecera plegable */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(s.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(s.id); }}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-canvas/50"
                >
                  <span className="text-muted">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{s.name}</span>
                      <SprintStatusBadge status={s.status} />
                      <span className="rounded-full bg-line/70 px-2 py-0.5 text-xs tabular text-muted">{rows.length} reqs</span>
                    </div>
                    {s.target_date && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <Calendar size={12} /> Objetivo: {formatDate(s.target_date)}
                      </span>
                    )}
                  </div>
                  <div className="hidden w-40 sm:block">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>{formatHours(s.consumed_hours)} / {formatHours(s.estimated_hours)}</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                  <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/sprints/${s.id}`}
                      className="hidden text-xs font-medium text-brand hover:underline md:block"
                    >
                      Ver detalle
                    </Link>
                    <button onClick={() => { setEditing(s); setOpen(true); }} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Editar sprint">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => onArchive(s, true)} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Archivar sprint" title="Archivar">
                      <Archive size={15} />
                    </button>
                    <button onClick={() => onDeleteSprint(s)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Eliminar sprint">
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>

                {/* Tabla desplegable */}
                {isOpen && (
                  <div className="border-t border-line">
                    {rows.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted">
                        Sin requerimientos. Asignalos arrastrando desde el Backlog.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                              <th className="px-4 py-2">ID</th>
                              <th className="px-2 py-2">Título</th>
                              <th className="px-2 py-2">Prioridad</th>
                              <th className="px-2 py-2">Estado</th>
                              <th className="px-2 py-2 text-right">Est.</th>
                              <th className="px-2 py-2 text-right">Cons.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr
                                key={r.id}
                                onClick={() => router.push(`/tracking/${r.id}`)}
                                className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/40"
                              >
                                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs font-semibold text-brand">{r.code}</td>
                                <td className="px-2 py-2 font-medium text-ink">{r.title}</td>
                                <td className="px-2 py-2"><PriorityBadge priority={r.priority} /></td>
                                <td className="px-2 py-2">
                                  <StatusStepper requirementId={r.id} value={r.status_id} statuses={statuses} sprintId={s.id} estimatedHours={Number(r.estimated_hours ?? 0)} />
                                </td>
                                <td className="px-2 py-2 text-right tabular text-muted">{formatHours(r.estimated_hours)}</td>
                                <td className="px-2 py-2 text-right tabular font-medium">{formatHours(r.consumed_hours)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <Archive size={15} /> Sprints archivados <Badge>{archived.length}</Badge>
          </h2>
          <div className="space-y-2">
            {archived.map((s) => (
              <Card key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-ink">{s.name}</span>
                <button onClick={() => onArchive(s, false)} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                  <ArchiveRestore size={14} /> Restaurar
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <SprintForm open={open} onClose={() => { setOpen(false); setEditing(null); }} sprint={editing} />
    </div>
  );
}
