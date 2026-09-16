"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, CardBody, Input, Label, Badge } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import { upsertCatalogItem, deleteCatalogItem, moveCatalogItem, type CatalogKind } from "@/lib/catalog-actions";
import { upsertPerson, deletePerson } from "@/lib/actions";

export type CatalogRow = { id: string; name: string; color?: string; is_final?: boolean; order: number };
export type PersonRow = { id: string; name: string; role: string | null };

type Data = Record<CatalogKind, CatalogRow[]>;
type View = "people" | "definitions" | CatalogKind;

const CATALOG_TABS: { key: CatalogKind; label: string; hasColor: boolean; ordered: boolean }[] = [
  { key: "req_statuses", label: "Estados", hasColor: true, ordered: true },
  { key: "req_priorities", label: "Prioridades", hasColor: true, ordered: true },
  { key: "req_types", label: "Tipos", hasColor: true, ordered: false },
  { key: "areas", label: "Áreas / Capítulos", hasColor: false, ordered: true },
  { key: "dashboards", label: "Dashboards", hasColor: false, ordered: true },
];

export function ConfigClient({ data, people }: { data: Data; people: PersonRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("people");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPeople = view === "people";
  const isDefinitions = view === "definitions";
  const isCatalog = !isPeople && !isDefinitions;
  const tab = view as CatalogKind;
  const active = isCatalog ? CATALOG_TABS.find((t) => t.key === tab) : undefined;
  const rows = isCatalog ? data[tab] : [];

  function onDelete(row: CatalogRow) {
    if (!confirm(`¿Eliminar "${row.name}"?`)) return;
    startTransition(async () => { await deleteCatalogItem(tab, row.id); router.refresh(); });
  }
  function move(index: number, dir: -1 | 1) {
    const other = rows[index + dir];
    const current = rows[index];
    if (!other) return;
    startTransition(async () => {
      await moveCatalogItem(tab, { id: current.id, order: current.order }, { id: other.id, order: other.order });
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Responsables y catálogos: estados, prioridades, tipos y áreas"
        actions={
          isCatalog && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Nuevo</Button>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        <TabBtn active={isPeople} onClick={() => setView("people")}>Responsables</TabBtn>
        {CATALOG_TABS.map((t) => (
          <TabBtn key={t.key} active={view === t.key} onClick={() => setView(t.key)}>{t.label}</TabBtn>
        ))}
        <TabBtn active={isDefinitions} onClick={() => setView("definitions")}>Definiciones</TabBtn>
      </div>

      {isPeople ? (
        <PeopleManager people={people} />
      ) : isDefinitions ? (
        <DefinitionsPanel />
      ) : (
        <Card>
          <CardBody>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No hay elementos. Agregá el primero.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((row, i) => (
                  <li key={row.id} className="flex items-center gap-3 py-2.5">
                    {active?.ordered && (
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0 || isPending} className="text-muted hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === rows.length - 1 || isPending} className="text-muted hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                      </div>
                    )}
                    <span className="w-6 text-center text-xs tabular text-muted">{i + 1}</span>
                    {active?.hasColor && row.color && <span className="h-4 w-4 shrink-0 rounded-full border border-line" style={{ backgroundColor: row.color }} />}
                    <span className="flex-1 text-sm font-medium text-ink">{row.name}</span>
                    {tab === "req_statuses" && row.is_final && <Badge color="#16A34A">final</Badge>}
                    <button onClick={() => { setEditing(row); setFormOpen(true); }} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                    <button onClick={() => onDelete(row)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {!isPeople && active && (
        <CatalogForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          kind={tab}
          label={active.label}
          hasColor={active.hasColor}
          showFinal={tab === "req_statuses"}
          editing={editing}
          onSaved={() => { setFormOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// Reglas de negocio vigentes del portal (documentación viva para el equipo).
const DEFINITIONS: { title: string; rules: string[] }[] = [
  {
    title: "Flujo de estados de un requerimiento",
    rules: [
      "Los estados y su orden se definen en la solapa «Estados». El flujo va de izquierda a derecha respetando ese orden.",
      "Un requerimiento nuevo arranca en «Nuevo».",
      "Al asignarlo a un sprint (o si estaba sin estado), pasa automáticamente a «Priorizado».",
      "Al cargar horas estimadas, pasa a «Estimado» (si su estado era anterior en el flujo).",
      "Al llevarlo a un estado final (p. ej. «Finalizado»), se piden las horas reales, que quedan registradas.",
      "Un estado marcado como «final» cuenta como Finalizado para las métricas del sprint.",
    ],
  },
  {
    title: "Sprints",
    rules: [
      "El estado del sprint se recalcula solo: sin requerimientos → «Planificado»; con requerimientos → «Activo»; todos finalizados → «Finalizado».",
      "«Pausado» es manual y no se pisa automáticamente.",
    ],
  },
  {
    title: "Horas",
    rules: [
      "El consumo se imputa FIFO: primero se agota el bloque de horas contratadas más antiguo.",
      "En el backlog, la columna «Util.» son las horas utilizadas (consumidas).",
    ],
  },
  {
    title: "Perfiles y accesos",
    rules: [
      "Staff (ADMIN / CONSULTANT, BiMetriks): acceso total a todas las secciones.",
      "Cliente (CLIENT, Samboro): sólo VE Inicio, Tareas, Backlog, Sprints, Tracking y Horas.",
      "El cliente NO accede a Facturación, Reportería, Documentación ni Configuración.",
      "El cliente sólo puede crear requerimientos; no puede editarlos ni priorizarlos.",
    ],
  },
  {
    title: "Requerimientos del cliente",
    rules: [
      "Se cargan con un formulario reducido: Título, Área, Página/Módulo, Dashboard, Descripción y Observaciones.",
      "Arrancan en estado «Nuevo», sin sprint y sin horas estimadas. El staff los prioriza.",
      "Se registra quién creó cada requerimiento y se muestra en el detalle («Creado por»).",
      "El color/etiqueta de origen distingue: Samboro (ámbar) vs BiMetriks (navy), con una barra a la izquierda de cada fila.",
      "El campo «Dashboard» indica en qué dashboard y página se quiere el requerimiento.",
    ],
  },
  {
    title: "Otros",
    rules: [
      "Cada requerimiento puede tener un checklist de subtareas con barra de progreso.",
      "El gráfico de Inicio muestra todos los estados (incluso en 0) en el orden de Configuración, con sensación de flujo.",
    ],
  },
];

function DefinitionsPanel() {
  return (
    <Card>
      <CardBody>
        <p className="mb-4 text-sm text-muted">
          Reglas de negocio vigentes del portal. Es documentación de referencia para el equipo (no se edita desde acá).
        </p>
        <div className="space-y-5">
          {DEFINITIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-sm font-semibold text-ink">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.rules.map((rule, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-brand text-white" : "text-muted hover:bg-canvas hover:text-ink"}`}>
      {children}
    </button>
  );
}

function PeopleManager({ people }: { people: PersonRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonRow | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  function openNew() { setEditing(null); setName(""); setRole(""); setOpen(true); }
  function openEdit(p: PersonRow) { setEditing(p); setName(p.name); setRole(p.role ?? ""); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await upsertPerson({ id: editing?.id, name, role });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }
  function remove(p: PersonRow) {
    if (!confirm(`¿Eliminar "${p.name}"? Quedará sin asignar en los requerimientos que lo usen.`)) return;
    startTransition(async () => { await deletePerson(p.id); router.refresh(); });
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted">Nombres que aparecen en Responsable / Validación al crear requerimientos.</p>
          <Button size="sm" onClick={openNew}><Plus size={15} /> Nuevo responsable</Button>
        </div>
        {people.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Agregá el primer responsable (ej: “Juan Farré · BI”).</p>
        ) : (
          <ul className="divide-y divide-line">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="flex-1 text-sm font-medium text-ink">{p.name}</span>
                {p.role && <Badge>{p.role}</Badge>}
                <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                <button onClick={() => remove(p)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar responsable" : "Nuevo responsable"}>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Farré" autoFocus required /></div>
            <div><Label>Rol / Área</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="BI, Logística, Costos…" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}><X size={15} /> Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</Button>
            </div>
          </form>
        </Modal>
      </CardBody>
    </Card>
  );
}

function CatalogForm({
  open, onClose, kind, label, hasColor, showFinal, editing, onSaved,
}: {
  open: boolean; onClose: () => void; kind: CatalogKind; label: string; hasColor: boolean; showFinal: boolean;
  editing: CatalogRow | null; onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await upsertCatalogItem(kind, {
      id: editing?.id,
      name: String(fd.get("name") ?? ""),
      color: hasColor ? String(fd.get("color") ?? "#64748B") : undefined,
      is_final: showFinal ? fd.get("is_final") === "on" : undefined,
    });
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar ${label}` : `Nuevo · ${label}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><Label>Nombre</Label><Input name="name" required defaultValue={editing?.name ?? ""} autoFocus /></div>
        {hasColor && (
          <div>
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" name="color" defaultValue={editing?.color ?? "#1E5EFF"} className="h-10 w-14 cursor-pointer rounded-lg border border-line" />
              <span className="text-xs text-muted">Se usa en los badges</span>
            </div>
          </div>
        )}
        {showFinal && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="is_final" defaultChecked={editing?.is_final ?? false} className="h-4 w-4 rounded border-line text-brand" />
            Es estado final (cuenta como “Finalizado”)
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
