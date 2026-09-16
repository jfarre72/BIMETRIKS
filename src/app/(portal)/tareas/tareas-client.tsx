"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, Input, Label, Select, Textarea, Badge, EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";
import { quickAddTask, saveTask, toggleTask, deleteTask } from "@/lib/actions";
import type { Task } from "@/lib/types";

const LABELS = ["URGENTE", "ALTA", "NORMAL", "BAJA"];
const LABEL_COLOR: Record<string, string> = { URGENTE: "#DC2626", ALTA: "#EA580C", NORMAL: "#64748B", BAJA: "#16A34A" };
type Filter = "abiertas" | "pendientes" | "vencidos" | "hechos" | "todos";
const today = new Date().toISOString().slice(0, 10);

function estado(t: Task): { label: string; color: string } {
  if (t.done) return { label: "Hecho", color: "#16A34A" };
  if (t.due_date && t.due_date < today) return { label: "Vencido", color: "#DC2626" };
  return { label: "Pendiente", color: "#CA8A04" };
}

export function TareasClient({ tasks, people }: { tasks: Task[]; people: string[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("abiertas");
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Copia local para actualizaciones optimistas: los cambios se ven al instante
  // y se persisten en segundo plano (sin esperar el ida y vuelta al servidor).
  const [items, setItems] = useState<Task[]>(tasks);
  useEffect(() => setItems(tasks), [tasks]);

  const done = items.filter((t) => t.done).length;
  const overdue = items.filter((t) => !t.done && t.due_date && t.due_date < today).length;

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (q && !`${t.title} ${t.detail ?? ""} ${t.assignee ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      const od = !t.done && t.due_date && t.due_date < today;
      if (filter === "abiertas") return !t.done;
      if (filter === "pendientes") return !t.done && !od;
      if (filter === "vencidos") return !!od;
      if (filter === "hechos") return t.done;
      return true;
    });
  }, [items, q, filter]);

  function onQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    // Alta optimista con id temporal; se reemplaza al refrescar del servidor.
    const temp: Task = {
      id: `temp-${Date.now()}`, title, detail: null, assignee: null,
      label: null, due_date: null, done: false, created_at: new Date().toISOString(),
    };
    setItems((prev) => [temp, ...prev]);
    setQuick("");
    startTransition(async () => {
      await quickAddTask(title);
      router.refresh();
    });
  }
  function onToggle(t: Task) {
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    startTransition(async () => {
      await toggleTask(t.id, !t.done);
      router.refresh();
    });
  }
  function onDelete(t: Task) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setItems((prev) => prev.filter((x) => x.id !== t.id));
    startTransition(async () => {
      await deleteTask(t.id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title="Tareas" subtitle="Pendientes y seguimiento de temas" />

      <Card className="mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium">{done}/{tasks.length} hechos</span>
            {overdue > 0 && <span className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">{overdue} vencidos</span>}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-line p-1">
            {(["abiertas", "pendientes", "vencidos", "hechos", "todos"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-brand text-white" : "text-muted hover:bg-canvas hover:text-ink"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <form onSubmit={onQuickAdd} className="flex flex-1 gap-2">
            <Input placeholder="Agregar tema rápido…" value={quick} onChange={(e) => setQuick(e.target.value)} />
            <Button type="submit" variant="secondary"><Plus size={16} /> Agregar</Button>
          </form>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Nueva tarea</Button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Sin tareas" description="Agregá un tema rápido arriba o creá una tarea con detalle." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-10 py-2 pl-3"></th>
                  <th className="w-10 px-2 py-2">#</th>
                  <th className="px-2 py-2">Tema</th>
                  <th className="w-32 px-2 py-2">Responsable</th>
                  <th className="w-24 px-2 py-2">Etiqueta</th>
                  <th className="w-28 px-2 py-2">Fecha</th>
                  <th className="w-24 px-2 py-2">Estado</th>
                  <th className="w-20 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const st = estado(t);
                  return (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                      <td className="py-2 pl-3">
                        <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30" />
                      </td>
                      <td className="px-2 py-2 text-center text-xs tabular text-muted">{i + 1}</td>
                      <td className="px-2 py-2">
                        <p className={`font-medium ${t.done ? "text-muted line-through" : "text-ink"}`}>{t.title}</p>
                        {t.detail && <p className="text-xs text-muted">{t.detail}</p>}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-muted">{t.assignee ?? "—"}</td>
                      <td className="px-2 py-2">{t.label ? <Badge color={LABEL_COLOR[t.label] ?? "#64748B"}>{t.label}</Badge> : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-muted">{t.due_date ? formatDate(t.due_date) : "—"}</td>
                      <td className="px-2 py-2"><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        <button onClick={() => { setEditing(t); setFormOpen(true); }} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                        <button onClick={() => onDelete(t)} className="rounded-lg p-1 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} people={people} />
    </div>
  );
}

function TaskForm({ open, onClose, task, people }: { open: boolean; onClose: () => void; task: Task | null; people: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await saveTask({
      id: task?.id,
      title: String(fd.get("title") ?? ""),
      detail: String(fd.get("detail") ?? ""),
      assignee: String(fd.get("assignee") ?? ""),
      label: String(fd.get("label") ?? ""),
      due_date: String(fd.get("due_date") ?? "") || null,
    });
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Editar tarea" : "Nueva tarea"}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><Label>Tema *</Label><Input name="title" required defaultValue={task?.title ?? ""} autoFocus /></div>
        <div><Label>Detalle</Label><Textarea name="detail" rows={2} defaultValue={task?.detail ?? ""} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Responsable</Label>
            <Input name="assignee" list="people-list" defaultValue={task?.assignee ?? ""} />
            <datalist id="people-list">{people.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <Label>Etiqueta</Label>
            <Select name="label" defaultValue={task?.label ?? "NORMAL"}>
              {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>
        </div>
        <div><Label>Fecha</Label><Input type="date" name="due_date" defaultValue={task?.due_date ?? ""} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Guardar</Button></div>
      </form>
    </Modal>
  );
}
