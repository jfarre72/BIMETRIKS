"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { updateRequirementField, quickLogHours, updateEstimatedHours } from "@/lib/actions";
import { Badge, Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import type { ReqStatus } from "@/lib/types";

const isEstimado = (s: ReqStatus | null | undefined) =>
  !!s && s.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim() === "estimado";

/** Cambia el estado al anterior/siguiente con un clic (optimista: el cambio se
 *  ve al instante y se persiste en segundo plano). Al llegar a un estado final
 *  abre el registro de horas reales (default = estimadas). */
export function StatusStepper({
  requirementId,
  value,
  statuses,
  sprintId = null,
  estimatedHours = 0,
  onPatch,
}: {
  requirementId: string;
  value: string | null;
  statuses: ReqStatus[];
  sprintId?: string | null;
  estimatedHours?: number;
  /** Actualización optimista del requerimiento en el listado. */
  onPatch?: (reqId: string, patch: { status_id?: string; estimated_hours?: number }) => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [finalOpen, setFinalOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [hours, setHours] = useState(String(estimatedHours || ""));
  const [estHours, setEstHours] = useState(String(estimatedHours || ""));
  const [saving, setSaving] = useState(false);

  const idx = statuses.findIndex((s) => s.id === current);
  const cur = statuses[idx];
  const prev = idx > 0 ? statuses[idx - 1] : null;
  // Sin estado (idx === -1): la flecha derecha arranca el flujo en el primer estado.
  const next =
    idx === -1 ? statuses[0] ?? null : idx < statuses.length - 1 ? statuses[idx + 1] : null;

  async function go(target: ReqStatus | null) {
    if (!target) return;
    setCurrent(target.id); // instantáneo
    onPatch?.(requirementId, { status_id: target.id }); // reflejo optimista en el listado
    if (target.is_final) {
      setHours(String(estimatedHours || ""));
      setFinalOpen(true);
    } else if (isEstimado(target) && !(estimatedHours > 0)) {
      // Al pasar a "Estimado" sin horas cargadas, pedirlas.
      setEstHours("");
      setEstOpen(true);
    }
    // Persistimos y refrescamos para reflejar el recálculo del estado del sprint.
    await updateRequirementField(requirementId, "status_id", target.id);
    router.refresh();
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await quickLogHours(requirementId, sprintId, Number(hours));
    setSaving(false);
    setFinalOpen(false);
    router.refresh(); // acá sí refrescamos para ver horas consumidas
  }

  async function saveEstimated(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onPatch?.(requirementId, { estimated_hours: Number(estHours) }); // instantáneo en el listado
    await updateEstimatedHours(requirementId, Number(estHours));
    setSaving(false);
    setEstOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={() => go(prev)} disabled={!prev} className="rounded-md border border-line p-1 text-muted hover:bg-canvas hover:text-ink disabled:opacity-30" aria-label="Estado anterior">
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[110px] text-center">
        {cur ? <Badge color={cur.color}>{cur.name}</Badge> : <Badge>Sin estado</Badge>}
      </span>
      <button onClick={() => go(next)} disabled={!next} className="rounded-md border border-line p-1 text-muted hover:bg-canvas hover:text-ink disabled:opacity-30" aria-label="Estado siguiente">
        <ChevronRight size={14} />
      </button>

      <Modal open={finalOpen} onClose={() => setFinalOpen(false)} title="Horas reales al finalizar">
        <form onSubmit={saveHours} className="space-y-3">
          <p className="text-sm text-muted">Por defecto se cargan las horas estimadas. Podés ajustarlas.</p>
          <div>
            <Label>Horas reales</Label>
            <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving && <Loader2 size={15} className="animate-spin" />} Guardar horas</Button>
          </div>
        </form>
      </Modal>

      <Modal open={estOpen} onClose={() => setEstOpen(false)} title="Horas estimadas">
        <form onSubmit={saveEstimated} className="space-y-3">
          <p className="text-sm text-muted">El requerimiento pasó a “Estimado”. Cargá las horas estimadas.</p>
          <div>
            <Label>Horas estimadas</Label>
            <Input type="number" step="0.25" min="0" value={estHours} onChange={(e) => setEstHours(e.target.value)} autoFocus required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving && <Loader2 size={15} className="animate-spin" />} Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
