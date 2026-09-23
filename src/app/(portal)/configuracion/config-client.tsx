"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Check, X, ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, CardBody, Input, Label, Badge, Textarea } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/sheet";
import { upsertCatalogItem, deleteCatalogItem, moveCatalogItem, type CatalogKind } from "@/lib/catalog-actions";
import { upsertPerson, deletePerson, upsertWorkLog, toggleWorkLogInvoiced, deleteWorkLog } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { formatHours } from "@/lib/utils";

export type CatalogRow = { id: string; name: string; color?: string; is_final?: boolean; order: number };

// Color de la empresa del responsable: Samboro (rojo) / BiMetriks (azul).
function companyColor(company: string): string | undefined {
  const c = company.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (c.includes("samboro")) return "#DC2626"; // rojo
  if (c.includes("bimetriks") || c.includes("bi metriks")) return "#1E5EFF"; // azul
  return undefined; // otras empresas: badge neutro
}
export type PersonRow = { id: string; name: string; role: string | null; company?: string | null };
export type WorkLogRow = {
  id: string;
  log_date: string;
  hours: number;
  concept: string;
  notes: string | null;
  image_path: string | null;
  image_name: string | null;
  image_url: string | null;
  invoiced: boolean;
};

type Data = Record<CatalogKind, CatalogRow[]>;
type View = "people" | "work_logs" | "definitions" | CatalogKind;

const CATALOG_TABS: { key: CatalogKind; label: string; hasColor: boolean; ordered: boolean }[] = [
  { key: "req_statuses", label: "Estados", hasColor: true, ordered: true },
  { key: "req_priorities", label: "Prioridades", hasColor: true, ordered: true },
  { key: "req_types", label: "Tipos", hasColor: true, ordered: false },
  { key: "areas", label: "Áreas / Capítulos", hasColor: false, ordered: true },
  { key: "dashboards", label: "Dashboards", hasColor: false, ordered: true },
];

export function ConfigClient({ data, people, workLogs }: { data: Data; people: PersonRow[]; workLogs: WorkLogRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("people");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPeople = view === "people";
  const isDefinitions = view === "definitions";
  const isWorkLogs = view === "work_logs";
  const isCatalog = !isPeople && !isDefinitions && !isWorkLogs;
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
        subtitle="Responsables, horas registrables y catálogos: estados, prioridades, tipos y áreas"
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
        <TabBtn active={isWorkLogs} onClick={() => setView("work_logs")}>Horas registrables</TabBtn>
        <TabBtn active={isDefinitions} onClick={() => setView("definitions")}>Definiciones</TabBtn>
      </div>

      {isPeople ? (
        <PeopleManager people={people} />
      ) : isWorkLogs ? (
        <WorkLogsManager logs={workLogs} />
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

      {isCatalog && active && (
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
      "«Horas registrables» (Configuración) es un registro interno de horas trabajadas que pueden no trasladarse al cliente; no impacta en el consumo de horas contratadas. Se marca si se facturaron o no.",
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
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  // Ordenados por empresa (alfabético; sin empresa al final) y luego por nombre.
  const sorted = useMemo(() => {
    return [...people].sort((a, b) => {
      const ca = (a.company ?? "").trim();
      const cb = (b.company ?? "").trim();
      if (!ca && cb) return 1;
      if (ca && !cb) return -1;
      const byCompany = ca.localeCompare(cb, "es", { sensitivity: "base" });
      if (byCompany !== 0) return byCompany;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [people]);

  function openNew() { setEditing(null); setName(""); setRole(""); setCompany(""); setOpen(true); }
  function openEdit(p: PersonRow) { setEditing(p); setName(p.name); setRole(p.role ?? ""); setCompany(p.company ?? ""); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await upsertPerson({ id: editing?.id, name, role, company });
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2">Responsable</th>
                  <th className="w-40 px-2 py-2">Empresa</th>
                  <th className="w-48 px-2 py-2">Rol / Área</th>
                  <th className="w-20 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{p.name.slice(0, 1).toUpperCase()}</span>
                        <span className="font-medium text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">{p.company ? <Badge color={companyColor(p.company)}>{p.company}</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-2.5">{p.role ? <Badge>{p.role}</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                      <button onClick={() => remove(p)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar responsable" : "Nuevo responsable"}>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Farré" autoFocus required /></div>
            <div><Label>Empresa</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="BiMetriks, Samboro…" /></div>
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

// Fechas `date` (YYYY-MM-DD) sin corrimiento de zona horaria.
function formatLocalDate(d: string): string {
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}
function todayISO(): string {
  const n = new Date();
  return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function WorkLogsManager({ logs }: { logs: WorkLogRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLogRow | null>(null);
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState("");
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoicedMap, setInvoicedMap] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const isInvoiced = (l: WorkLogRow) => invoicedMap[l.id] ?? l.invoiced;
  const total = logs.reduce((a, l) => a + l.hours, 0);
  const invoiced = logs.filter(isInvoiced).reduce((a, l) => a + l.hours, 0);

  function reset(l: WorkLogRow | null) {
    setEditing(l);
    setDate(l?.log_date ?? todayISO());
    setHours(l ? String(l.hours) : "");
    setConcept(l?.concept ?? "");
    setNotes(l?.notes ?? "");
    setFile(null);
    setPreview(l?.image_url ?? null);
    setRemoveImage(false);
    setError(null);
    setOpen(true);
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("El archivo debe ser una imagen");
    setError(null);
    setFile(f);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let image_path = editing?.image_path ?? null;
    let image_name = editing?.image_name ?? null;
    const oldPath = editing?.image_path ?? null;
    if (file) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "imagen";
      const path = `work-logs/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("attachments").upload(path, file);
      if (up.error) { setSaving(false); return setError(up.error.message); }
      image_path = path;
      image_name = file.name;
    } else if (removeImage) {
      image_path = null;
      image_name = null;
    }
    const res = await upsertWorkLog({ id: editing?.id, log_date: date, hours: Number(hours), concept, notes, image_path, image_name });
    if (!res.ok) {
      if (file && image_path) await supabase.storage.from("attachments").remove([image_path]);
      setSaving(false);
      return setError(res.error ?? "No se pudo guardar");
    }
    if (oldPath && oldPath !== image_path) await supabase.storage.from("attachments").remove([oldPath]);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  function toggle(l: WorkLogRow, value: boolean) {
    setInvoicedMap((m) => ({ ...m, [l.id]: value }));
    startTransition(async () => { await toggleWorkLogInvoiced(l.id, value); router.refresh(); });
  }

  function remove(l: WorkLogRow) {
    if (!confirm(`¿Eliminar el registro "${l.concept}"?`)) return;
    startTransition(async () => { await deleteWorkLog(l.id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Horas registradas" value={formatHours(total)} accent="#0B1E3F" />
        <StatCard label="Facturadas" value={formatHours(invoiced)} accent="#16A34A" />
        <StatCard label="Sin facturar" value={formatHours(total - invoiced)} accent="#F59E0B" />
      </div>

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Registro interno de horas trabajadas (pueden no trasladarse al cliente).</p>
            <Button size="sm" onClick={() => reset(null)}><Plus size={15} /> Registrar horas</Button>
          </div>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Todavía no hay horas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="w-28 px-2 py-2">Fecha</th>
                    <th className="w-20 px-2 py-2 text-right">Horas</th>
                    <th className="px-2 py-2">Concepto</th>
                    <th className="px-2 py-2">Observación</th>
                    <th className="w-20 px-2 py-2">Imagen</th>
                    <th className="w-24 px-2 py-2 text-center">Facturadas</th>
                    <th className="w-20 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-line align-top last:border-0 hover:bg-canvas/40">
                      <td className="whitespace-nowrap px-2 py-2.5 text-muted">{formatLocalDate(l.log_date)}</td>
                      <td className="px-2 py-2.5 text-right font-medium tabular">{formatHours(l.hours)}</td>
                      <td className="px-2 py-2.5 font-medium text-ink">{l.concept}</td>
                      <td className="whitespace-pre-line px-2 py-2.5 text-muted">{l.notes || "—"}</td>
                      <td className="px-2 py-2.5">
                        {l.image_url ? (
                          <a href={l.image_url} target="_blank" rel="noreferrer" title={l.image_name ?? ""}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.image_url} alt={l.image_name ?? ""} className="h-10 w-14 rounded-md border border-line object-cover" />
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={isInvoiced(l)}
                            onChange={(e) => toggle(l, e.target.checked)}
                            className="h-4 w-4 rounded border-line text-green-600 focus:ring-green-500/30"
                          />
                          {isInvoiced(l) ? "Sí" : "No"}
                        </label>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right">
                        <button onClick={() => reset(l)} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                        <button onClick={() => remove(l)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar horas registradas" : "Registrar horas"}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div><Label>Horas trabajadas</Label><Input type="number" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2" required /></div>
          </div>
          <div><Label>Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Reunión de relevamiento, soporte…" required autoFocus /></div>
          <div><Label>Observación</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Detalle opcional" /></div>
          <div>
            <Label>Imagen</Label>
            <div
              tabIndex={0}
              onPaste={(e) => { const f = e.clipboardData.files[0]; if (f) { e.preventDefault(); pickFile(f); } }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-canvas/50 p-3 text-sm text-muted hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {preview && !removeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-14 w-20 rounded-md border border-line object-cover" />
              ) : (
                <ImagePlus size={20} />
              )}
              <span className="flex-1">
                {preview && !removeImage ? "Cambiar imagen" : <>Elegí, arrastrá o pegá una imagen (<kbd className="rounded bg-line px-1 text-xs">Ctrl</kbd>+<kbd className="rounded bg-line px-1 text-xs">V</kbd>)</>}
              </span>
              {preview && !removeImage && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setRemoveImage(true); }}
                  className="rounded-lg p-1.5 hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar imagen"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}><X size={15} /> Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
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
