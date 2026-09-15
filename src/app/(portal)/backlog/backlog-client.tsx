"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, Input, Select } from "@/components/ui";
import { BacklogBoard } from "@/components/backlog/backlog-board";
import type { Catalogs, Requirement, Sprint } from "@/lib/types";
import { RequirementForm } from "./requirement-form";

export function BacklogClient({
  requirements,
  sprints,
  catalogs,
}: {
  requirements: Requirement[];
  sprints: Sprint[];
  catalogs: Catalogs;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  // Copia local para reflejar altas/ediciones al instante; se resincroniza
  // con el servidor cuando llega el refresh.
  const [localReqs, setLocalReqs] = useState<Requirement[]>(requirements);
  useEffect(() => setLocalReqs(requirements), [requirements]);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");

  const hasFilters = q || area || status || priority || type;

  const filtered = useMemo(() => {
    return localReqs.filter((r) => {
      if (q && !`${r.code} ${r.title}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (area && r.area_id !== area) return false;
      if (status && r.status_id !== status) return false;
      if (priority && r.priority_id !== priority) return false;
      if (type && r.type_id !== type) return false;
      return true;
    });
  }, [localReqs, q, area, status, priority, type]);

  // Remonta el board cuando cambian filtros o la pertenencia a sprints. Los
  // cambios de campos (estado, horas) se sincronizan sin remontar (ver board),
  // para no perder los grupos expandidos.
  const boardKey = useMemo(
    () => `${q}|${area}|${status}|${priority}|${type}|` + filtered.map((r) => `${r.id}:${r.sprint?.id ?? ""}`).join(","),
    [filtered, q, area, status, priority, type]
  );

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(req: Requirement) { setEditing(req); setFormOpen(true); }

  function onSaved(req: Requirement, isEdit: boolean) {
    setLocalReqs((prev) => (isEdit ? prev.map((r) => (r.id === req.id ? req : r)) : [req, ...prev]));
  }

  return (
    <div>
      <PageHeader
        title="Backlog"
        subtitle="Arrastrá para ordenar por prioridad y asignar a sprints"
        actions={<Button onClick={openNew}><Plus size={16} /> Nuevo requerimiento</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Buscar por REQ o título…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {hasFilters && (
          <button
            onClick={() => { setQ(""); setArea(""); setStatus(""); setPriority(""); setType(""); }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </Card>

      <BacklogBoard key={boardKey} requirements={filtered} sprints={sprints} statuses={catalogs.statuses} onEdit={openEdit} />

      <RequirementForm open={formOpen} onClose={() => setFormOpen(false)} catalogs={catalogs} requirement={editing} onSaved={onSaved} />
    </div>
  );
}
