"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Layers, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, Input, Select, Badge, EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import { StatusBadge, PriorityBadge } from "@/components/shared/req-badges";
import { formatHours } from "@/lib/utils";
import { assignToSprint } from "@/lib/actions";
import type { Catalogs, Requirement } from "@/lib/types";
import { RequirementForm } from "./requirement-form";

export function BacklogClient({ requirements, catalogs }: { requirements: Requirement[]; catalogs: Catalogs }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [assignee, setAssignee] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [sprintDialog, setSprintDialog] = useState(false);

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (q && !`${r.code} ${r.title}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (area && r.area_id !== area) return false;
      if (status && r.status_id !== status) return false;
      if (priority && r.priority_id !== priority) return false;
      if (type && r.type_id !== type) return false;
      if (assignee && r.assignee_id !== assignee) return false;
      return true;
    });
  }, [requirements, q, area, status, priority, type, assignee]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(filtered.map((r) => r.id)));
  }

  return (
    <div>
      <PageHeader
        title="Backlog"
        subtitle="Administración de todos los requerimientos"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} /> Nuevo requerimiento
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Buscar por ID o título…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Área</option>
            {catalogs.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Estado</option>
            {catalogs.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Prioridad</option>
            {catalogs.priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tipo</option>
            {catalogs.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </Card>

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-sm font-medium text-ink">{selected.size} seleccionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSelected(new Set())}>Limpiar</Button>
            <Button size="sm" onClick={() => setSprintDialog(true)}>
              <Layers size={15} /> Asignar a Sprint
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No hay requerimientos"
          description="Creá el primero con el botón «Nuevo requerimiento»."
          action={<Button onClick={() => setFormOpen(true)}><Plus size={16} /> Nuevo requerimiento</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-line text-brand" />
                  </th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Área</th>
                  <th className="px-3 py-3">Prioridad</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Responsable</th>
                  <th className="px-3 py-3 text-right">Est.</th>
                  <th className="px-3 py-3 text-right">Cons.</th>
                  <th className="px-3 py-3">Sprint</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 rounded border-line text-brand" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-brand">
                      <Link href={`/tracking/${r.id}`} className="hover:underline">{r.code}</Link>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => { setEditing(r); setFormOpen(true); }} className="text-left font-medium text-ink hover:text-brand">
                        {r.title}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{r.area?.name ?? "—"}</td>
                    <td className="px-3 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{r.assignee?.full_name ?? r.assignee?.username ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular text-muted">{formatHours(r.estimated_hours)}</td>
                    <td className="px-3 py-3 text-right tabular font-medium">{formatHours(r.consumed_hours)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{r.sprint ? <Badge>{r.sprint.name}</Badge> : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <RequirementForm open={formOpen} onClose={() => setFormOpen(false)} catalogs={catalogs} requirement={editing} />

      <AssignSprintDialog
        open={sprintDialog}
        onClose={() => setSprintDialog(false)}
        sprints={catalogs.sprints}
        onDone={() => { setSprintDialog(false); setSelected(new Set()); router.refresh(); }}
        requirementIds={[...selected]}
      />
    </div>
  );
}

function AssignSprintDialog({
  open,
  onClose,
  sprints,
  requirementIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  sprints: Catalogs["sprints"];
  requirementIds: string[];
  onDone: () => void;
}) {
  const [sprintId, setSprintId] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!sprintId) return;
    setPending(true);
    await assignToSprint(sprintId, requirementIds);
    setPending(false);
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Asignar a Sprint">
      <p className="mb-3 text-sm text-muted">Asignar {requirementIds.length} requerimiento(s) a:</p>
      <Select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
        <option value="">Seleccioná un sprint…</option>
        {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
      </Select>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={!sprintId || pending}>
          {pending && <Loader2 size={16} className="animate-spin" />} Asignar
        </Button>
      </div>
    </Modal>
  );
}
