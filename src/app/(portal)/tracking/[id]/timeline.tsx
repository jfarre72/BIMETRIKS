"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button, Input, Select, Textarea, Badge, EmptyState } from "@/components/ui";
import { addRequirementNote, deleteRequirementNote } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import type { RequirementNote } from "@/lib/types";

const EVENT_TYPES = ["nota", "estado", "prioridad", "horas", "hito"] as const;
const EVENT_COLOR: Record<string, string> = {
  nota: "#64748B",
  estado: "#1E5EFF",
  prioridad: "#EA580C",
  horas: "#16A34A",
  hito: "#8B5CF6",
  edición: "#0891B2",
  sprint: "#DB2777",
};

export function Timeline({ requirementId, notes }: { requirementId: string; notes: RequirementNote[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await addRequirementNote(null, new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar");
    e.currentTarget.reset();
    setAdding(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Historial / Timeline</h3>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Agregar nota
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="mb-5 rounded-xl border border-line bg-canvas/60 p-4">
          <input type="hidden" name="requirement_id" value={requirementId} />
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Select name="event_type" defaultValue="nota">
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input type="date" name="event_date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <Textarea name="body" rows={2} required placeholder="Ej: Pasó a Desarrollo / Se acordó estimación de 5 h…" />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 size={15} className="animate-spin" />} Guardar
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyState
          title="Sin registros aún"
          description="Anotá acá lo que surja en cada reunión de avance."
          icon={<MessageSquarePlus size={26} />}
        />
      ) : (
        <ol className="relative border-l border-line pl-6">
          {notes.map((n) => (
            <li key={n.id} className="mb-6 last:mb-0">
              <span
                className="absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-white"
                style={{ backgroundColor: EVENT_COLOR[n.event_type] ?? "#64748B" }}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted">{formatDate(n.event_date)}</span>
                <Badge color={EVENT_COLOR[n.event_type]}>{n.event_type}</Badge>
                <button
                  onClick={async () => {
                    if (!confirm("¿Eliminar esta nota?")) return;
                    await deleteRequirementNote(n.id, requirementId);
                    router.refresh();
                  }}
                  className="ml-auto rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar nota"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-ink">{n.body}</p>
              {n.author && (
                <p className="mt-0.5 text-xs text-muted">— {n.author.full_name ?? n.author.username}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
