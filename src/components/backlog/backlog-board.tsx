"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
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
import { GripVertical, Layers, Inbox } from "lucide-react";
import { Card } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/shared/req-badges";
import { SprintStatusBadge } from "@/components/shared/sprint-status";
import { formatHours } from "@/lib/utils";
import { moveRequirement } from "@/lib/actions";
import type { Requirement, Sprint } from "@/lib/types";

const UNASSIGNED = "unassigned";

type Groups = Record<string, Requirement[]>;

export function BacklogBoard({
  requirements,
  sprints,
}: {
  requirements: Requirement[];
  sprints: Sprint[];
}) {
  const router = useRouter();

  // Orden de grupos: cada sprint (más antiguo primero) y al final "Sin asignar".
  const groupOrder = useMemo(() => [...sprints.map((s) => s.id), UNASSIGNED], [sprints]);
  const sprintById = useMemo(() => Object.fromEntries(sprints.map((s) => [s.id, s])), [sprints]);

  const [groups, setGroups] = useState<Groups>(() => buildGroups(requirements, groupOrder));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const allById = useMemo(() => {
    const m: Record<string, Requirement> = {};
    Object.values(groups).flat().forEach((r) => (m[r.id] = r));
    return m;
  }, [groups]);

  function findContainer(id: string): string | undefined {
    if (id in groups) return id;
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
    const to = findContainer(overId) ?? (overId in groups ? overId : undefined);
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
    const targetSprintId = container === UNASSIGNED ? null : container;
    await moveRequirement(activeId, targetSprintId, orderedIds);
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
      <div className="space-y-5">
        {groupOrder.map((gid) => {
          const isUnassigned = gid === UNASSIGNED;
          const sprint = sprintById[gid];
          const rows = groups[gid] ?? [];
          return (
            <GroupTable
              key={gid}
              groupId={gid}
              title={isUnassigned ? "Sin asignar" : sprint?.name ?? "Sprint"}
              subtitle={isUnassigned ? "Pendientes de asignación a un sprint" : undefined}
              status={isUnassigned ? undefined : sprint?.status}
              icon={isUnassigned ? <Inbox size={16} /> : <Layers size={16} />}
              rows={rows}
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
  subtitle,
  status,
  icon,
  rows,
}: {
  groupId: string;
  title: string;
  subtitle?: string;
  status?: string;
  icon: React.ReactNode;
  rows: Requirement[];
}) {
  const totalEst = rows.reduce((a, r) => a + Number(r.estimated_hours ?? 0), 0);
  const totalCons = rows.reduce((a, r) => a + Number(r.consumed_hours ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted">{icon}</span>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <span className="rounded-full bg-line/70 px-2 py-0.5 text-xs tabular text-muted">{rows.length}</span>
          {status && <SprintStatusBadge status={status} />}
        </div>
        {subtitle && <span className="hidden text-xs text-muted sm:block">{subtitle}</span>}
      </div>

      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-8 py-2 pl-3"></th>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Título</th>
                <th className="px-2 py-2">Área</th>
                <th className="px-2 py-2">Prioridad</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2 text-right">Est.</th>
                <th className="px-2 py-2 text-right">Cons.</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted">
                    Arrastrá requerimientos hasta acá.
                  </td>
                </tr>
              ) : (
                rows.map((r) => <Row key={r.id} req={r} />)
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-line font-medium">
                  <td colSpan={6} className="px-2 py-2 text-right text-xs text-muted">Total</td>
                  <td className="px-2 py-2 text-right tabular">{formatHours(totalEst)}</td>
                  <td className="px-2 py-2 text-right tabular">{formatHours(totalCons)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SortableContext>
    </Card>
  );
}

function Row({ req }: { req: Requirement }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: req.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-line last:border-0 hover:bg-canvas/50">
      <td className="py-2 pl-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted hover:text-ink active:cursor-grabbing"
          aria-label="Arrastrar"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="whitespace-nowrap px-2 py-2 font-mono text-xs font-semibold text-brand">
        <Link href={`/tracking/${req.id}`} className="hover:underline">{req.code}</Link>
      </td>
      <td className="px-2 py-2 font-medium text-ink">{req.title}</td>
      <td className="whitespace-nowrap px-2 py-2 text-muted">{req.area?.name ?? "—"}</td>
      <td className="px-2 py-2"><PriorityBadge priority={req.priority} /></td>
      <td className="px-2 py-2"><StatusBadge status={req.status} /></td>
      <td className="px-2 py-2 text-right tabular text-muted">{formatHours(req.estimated_hours)}</td>
      <td className="px-2 py-2 text-right tabular font-medium">{formatHours(req.consumed_hours)}</td>
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
  // Cada grupo respeta el orden de sort_index (ya viene ordenado de la query).
  return groups;
}
