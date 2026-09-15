"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Layers, Inbox, Trash2, Pencil, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { PriorityBadge } from "@/components/shared/req-badges";
import { StatusStepper } from "@/components/shared/status-stepper";
import { SprintStatusBadge } from "@/components/shared/sprint-status";
import { formatHours } from "@/lib/utils";
import { moveRequirement, deleteRequirement } from "@/lib/actions";
import type { Catalogs, Requirement, Sprint } from "@/lib/types";

const UNASSIGNED = "unassigned";
type Groups = Record<string, Requirement[]>;

export function BacklogBoard({
  requirements,
  sprints,
  statuses,
  onEdit,
}: {
  requirements: Requirement[];
  sprints: Sprint[];
  statuses: Catalogs["statuses"];
  onEdit: (req: Requirement) => void;
}) {
  const router = useRouter();
  const groupOrder = useMemo(() => [...sprints.map((s) => s.id), UNASSIGNED], [sprints]);
  const sprintById = useMemo(() => Object.fromEntries(sprints.map((s) => [s.id, s])), [sprints]);
  const [groups, setGroups] = useState<Groups>(() => buildGroups(requirements, groupOrder));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Resincroniza con los datos del servidor cuando cambian (p. ej. tras
  // actualizar estado u horas), sin remontar el board: así se reflejan al
  // instante y se conservan los grupos expandidos.
  useEffect(() => {
    setGroups(buildGroups(requirements, groupOrder));
  }, [requirements, groupOrder]);

  // Abrir por defecto: último sprint activo + "Sin asignar". Resto plegado.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const lastActive = [...sprints].reverse().find((s) => s.status === "Activo");
    const open = new Set<string>([UNASSIGNED]);
    if (lastActive) open.add(lastActive.id);
    else if (sprints.length) open.add(sprints[sprints.length - 1].id);
    return open;
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allById = useMemo(() => {
    const m: Record<string, Requirement> = {};
    Object.values(groups).flat().forEach((r) => (m[r.id] = r));
    return m;
  }, [groups]);

  function toggle(gid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(gid) ? next.delete(gid) : next.add(gid);
      return next;
    });
  }

  function findContainer(id: string): string | undefined {
    if (groups[id]) return id;
    return groupOrder.find((g) => groups[g]?.some((r) => r.id === id));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findContainer(activeId);
    const to = groups[overId] ? overId : findContainer(overId);
    if (!from || !to || from === to) return;
    setGroups((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const idx = fromItems.findIndex((r) => r.id === activeId);
      if (idx < 0) return prev;
      const [moved] = fromItems.splice(idx, 1);
      const overIdx = toItems.findIndex((r) => r.id === overId);
      const insertAt = overIdx >= 0 ? overIdx : toItems.length;
      toItems.splice(insertAt, 0, moved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    const container = findContainer(activeId);
    if (!container) return;
    let next = groups;
    const items = groups[container];
    const oldIdx = items.findIndex((r) => r.id === activeId);
    const newIdx = items.findIndex((r) => r.id === overId);
    if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
      next = { ...groups, [container]: arrayMove(items, oldIdx, newIdx) };
      setGroups(next);
    }
    const orderedIds = next[container].map((r) => r.id);
    await moveRequirement(activeId, container === UNASSIGNED ? null : container, orderedIds);
    router.refresh();
  }

  async function onDelete(req: Requirement) {
    if (!confirm(`¿Eliminar ${req.code} — "${req.title}"? Se archiva (no se borra el historial).`)) return;
    setGroups((prev) => {
      const c = findContainer(req.id);
      if (!c) return prev;
      return { ...prev, [c]: prev[c].filter((r) => r.id !== req.id) };
    });
    await deleteRequirement(req.id);
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-3">
        {groupOrder.map((gid) => {
          const isUnassigned = gid === UNASSIGNED;
          const sprint = sprintById[gid];
          return (
            <GroupTable
              key={gid}
              groupId={gid}
              title={isUnassigned ? "Sin asignar" : sprint?.name ?? "Sprint"}
              status={isUnassigned ? undefined : sprint?.status}
              icon={isUnassigned ? <Inbox size={16} /> : <Layers size={16} />}
              rows={groups[gid] ?? []}
              statuses={statuses}
              expanded={expanded.has(gid)}
              onToggle={() => toggle(gid)}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpen={(id) => router.push(`/tracking/${id}`)}
              sprintHref={isUnassigned ? undefined : `/sprints/${gid}`}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeId && allById[activeId] ? (
          <div className="rounded-lg border border-brand bg-white px-3 py-2 text-sm font-medium shadow-float">
            <span className="font-mono text-xs text-brand">{allById[activeId].code}</span> · {allById[activeId].title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function GroupTable({
  groupId,
  title,
  status,
  icon,
  rows,
  statuses,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onOpen,
  sprintHref,
}: {
  groupId: string;
  title: string;
  status?: string;
  icon: React.ReactNode;
  rows: Requirement[];
  statuses: Catalogs["statuses"];
  expanded: boolean;
  onToggle: () => void;
  onEdit: (r: Requirement) => void;
  onDelete: (r: Requirement) => void;
  onOpen: (id: string) => void;
  sprintHref?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: groupId });
  const totalEst = rows.reduce((a, r) => a + Number(r.estimated_hours ?? 0), 0);
  const totalCons = rows.reduce((a, r) => a + Number(r.consumed_hours ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-3 py-2">
        <button onClick={onToggle} className="flex items-center gap-2 text-left">
          <span className="text-muted">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
          <span className="text-muted">{icon}</span>
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="rounded-full bg-line/70 px-2 py-0.5 text-xs tabular text-muted">{rows.length}</span>
          {status && <SprintStatusBadge status={status} />}
        </button>
        {sprintHref && (
          <Link href={sprintHref} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            Ir al sprint <ExternalLink size={12} />
          </Link>
        )}
      </div>

      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={isOver ? "bg-brand/5" : undefined}>
          {expanded ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="w-12 py-2 pl-3">#</th>
                    <th className="w-24 px-2 py-2">ID</th>
                    <th className="px-2 py-2">Título</th>
                    <th className="w-40 px-2 py-2">Área</th>
                    <th className="w-24 px-2 py-2">Prioridad</th>
                    <th className="w-52 px-2 py-2">Estado</th>
                    <th className="w-16 px-2 py-2 text-right">Est.</th>
                    <th className="w-16 px-2 py-2 text-right">Cons.</th>
                    <th className="w-16 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">Arrastrá requerimientos hasta acá.</td></tr>
                  ) : (
                    rows.map((r, i) => (
                      <Row key={r.id} req={r} index={i + 1} statuses={statuses} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} />
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-line font-medium">
                      <td colSpan={6} className="px-2 py-2 text-right text-xs text-muted">Total</td>
                      <td className="px-2 py-2 text-right tabular">{formatHours(totalEst)}</td>
                      <td className="px-2 py-2 text-right tabular">{formatHours(totalCons)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="px-4 py-2 text-xs text-muted">
              {rows.length} req · {formatHours(totalEst)} est · {formatHours(totalCons)} cons — {isOver ? "soltá para asignar" : "plegado"}
            </div>
          )}
        </div>
      </SortableContext>
    </Card>
  );
}

function Row({
  req,
  index,
  statuses,
  onEdit,
  onDelete,
  onOpen,
}: {
  req: Requirement;
  index: number;
  statuses: Catalogs["statuses"];
  onEdit: (r: Requirement) => void;
  onDelete: (r: Requirement) => void;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: req.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(req.id)}
      className="cursor-grab touch-none border-b border-line last:border-0 hover:bg-canvas/50 active:cursor-grabbing"
    >
      <td className="py-2 pl-3">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <GripVertical size={14} className="opacity-60" />
          <span className="tabular text-xs font-semibold">{index}</span>
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-2 font-mono text-xs font-semibold text-brand">{req.code}</td>
      <td className="px-2 py-2 font-medium text-ink">{req.title}</td>
      <td className="whitespace-nowrap px-2 py-2 text-muted">{req.area?.name ?? "—"}</td>
      <td className="px-2 py-2"><PriorityBadge priority={req.priority} /></td>
      <td className="px-2 py-2">
        <StatusStepper requirementId={req.id} value={req.status_id} statuses={statuses} sprintId={req.sprint?.id ?? null} estimatedHours={Number(req.estimated_hours ?? 0)} />
      </td>
      <td className="px-2 py-2 text-right tabular text-muted">{formatHours(req.estimated_hours)}</td>
      <td className="px-2 py-2 text-right tabular font-medium">{formatHours(req.consumed_hours)}</td>
      <td className="whitespace-nowrap px-2 py-2 text-right" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(req)} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink" aria-label="Editar"><Pencil size={15} /></button>
        <button onClick={() => onDelete(req)} className="rounded-lg p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
      </td>
    </tr>
  );
}

function buildGroups(reqs: Requirement[], order: string[]): Groups {
  const groups: Groups = {};
  order.forEach((g) => (groups[g] = []));
  reqs.forEach((r) => {
    const gid = r.sprint?.id && groups[r.sprint.id] ? r.sprint.id : UNASSIGNED;
    groups[gid].push(r);
  });
  return groups;
}
