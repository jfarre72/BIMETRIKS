"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Clock, Trash2 } from "lucide-react";
import { Button, Input, Label, ProgressBar, EmptyState } from "@/components/ui";
import { logRequirementHours, deleteRequirementTimeEntry } from "@/lib/actions";
import { formatDate, formatHours, pct } from "@/lib/utils";
import type { RequirementTimeEntry } from "@/lib/types";

/** Registro de horas del requerimiento: se cargan a medida que se trabaja
 *  (fecha, horas, observación) y se suman a las horas utilizadas. */
export function RequirementHours({
  requirementId,
  estimated,
  consumed,
  entries,
  statusName,
  canLog,
  isFinal,
}: {
  requirementId: string;
  estimated: number;
  consumed: number;
  entries: RequirementTimeEntry[];
  statusName?: string | null;
  /** Sólo el ADMIN carga / borra horas. */
  canLog: boolean;
  /** Finalizado: las horas quedan como están (sólo lectura). */
  isFinal: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canLog && !isFinal;
  const over = estimated > 0 && consumed > estimated;
  const remaining = Math.max(estimated - consumed, 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    const res = await logRequirementHours(null, new FormData(form));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar");
    form.reset();
    setAdding(false);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este registro de horas?")) return;
    const res = await deleteRequirementTimeEntry(id, requirementId);
    if (!res.ok) return alert(res.error ?? "No se pudo eliminar");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Registro de horas</h3>
        {editable && !adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Registrar horas
          </Button>
        )}
      </div>

      {/* Resumen: estimado / utilizado */}
      <div className="mb-4 rounded-xl border border-line bg-canvas/60 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="text-muted">Estimado</span>
          <span className="font-semibold tabular text-ink">{formatHours(estimated)}</span>
          <span className="text-muted">/</span>
          <span className="text-muted">Utilizado</span>
          <span className="font-semibold tabular" style={{ color: over ? "#DC2626" : "#1E5EFF" }}>
            {formatHours(consumed)}
          </span>
          {statusName && <span className="text-muted">({statusName})</span>}
          {estimated > 0 && (
            <span className="ml-auto text-xs text-muted">
              {over ? `Excedido en ${formatHours(consumed - estimated)}` : `Restan ${formatHours(remaining)}`} · {pct(consumed, estimated)}%
            </span>
          )}
        </div>
        {estimated > 0 && (
          <ProgressBar className="mt-2" value={pct(consumed, estimated)} color={over ? "#DC2626" : "#1E5EFF"} />
        )}
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="mb-5 rounded-xl border border-line bg-canvas/60 p-4">
          <input type="hidden" name="requirement_id" value={requirementId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_120px_1fr]">
            <div>
              <Label>Fecha</Label>
              <Input type="date" name="entry_date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <Label>Horas</Label>
              <Input type="number" name="hours" step="0.25" min="0.25" placeholder="2" autoFocus required />
            </div>
            <div>
              <Label>Observación</Label>
              <Input name="description" placeholder="Ej: Modelado de tablas / ajustes de visual…" />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 size={15} className="animate-spin" />} Guardar
            </Button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="Sin horas registradas"
          description={editable ? "Cargá las horas a medida que trabajás en el requerimiento." : undefined}
          icon={<Clock size={26} />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 text-right font-medium">Horas</th>
                <th className="px-2 py-2 font-medium">Observación</th>
                <th className="px-2 py-2 font-medium">Cargado por</th>
                {editable && <th className="w-8 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((t) => (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="whitespace-nowrap px-2 py-2 text-muted">{formatDate(t.entry_date + "T00:00:00")}</td>
                  <td className="px-2 py-2 text-right tabular font-medium text-ink">{formatHours(t.hours)}</td>
                  <td className="px-2 py-2 text-ink">{t.description || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-muted">{t.creator?.full_name || t.creator?.username || "—"}</td>
                  {editable && (
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => onDelete(t.id)}
                        className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-semibold text-ink">
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-right tabular">{formatHours(consumed)}</td>
                <td colSpan={editable ? 3 : 2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
