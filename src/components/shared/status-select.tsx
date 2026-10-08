"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateRequirementField, quickLogHours, updateEstimatedHours } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import type { ReqStatus } from "@/lib/types";
import { formatHours } from "@/lib/utils";
import { statusesForKind } from "@/lib/requirement-kind";

const isEstimado = (s: ReqStatus | null | undefined) =>
  !!s && s.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim() === "estimado";

/** Select inline para cambiar el estado. Al pasar a un estado "final" abre un
 *  modal para cargar las horas reales (que quedan registradas en el sprint). */
export function StatusSelect({
  requirementId,
  value,
  statuses: allStatuses,
  sprintId = null,
  estimatedHours = 0,
  consumedHours = 0,
  kind = "REQ",
}: {
  requirementId: string;
  value: string | null;
  statuses: ReqStatus[];
  sprintId?: string | null;
  estimatedHours?: number;
  /** Horas ya registradas: si hay, al finalizar sólo se piden las restantes. */
  consumedHours?: number;
  /** MEETING = reunión: sólo Nuevo / Priorizado / Estimado / Finalizado. */
  kind?: string | null;
}) {
  const router = useRouter();
  const statuses = statusesForKind(allStatuses, kind);
  const [current, setCurrent] = useState(value ?? "");
  const [finalOpen, setFinalOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  // Con horas ya registradas durante el desarrollo, al finalizar no se vuelve a
  // cargar el estimado (duplicaría): sólo se agregan las que falten (0 = ninguna).
  const hasLogged = consumedHours > 0;
  const finalDefault = hasLogged ? "0" : String(estimatedHours || "");
  const [hours, setHours] = useState(finalDefault);
  const [estHours, setEstHours] = useState(String(estimatedHours || ""));
  const [saving, setSaving] = useState(false);
  const color = statuses.find((s) => s.id === current)?.color ?? "#64748B";

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = e.target.value;
    const target = statuses.find((s) => s.id === nextId);
    setCurrent(nextId); // instantáneo
    if (target?.is_final) { setHours(finalDefault); setFinalOpen(true); }
    else if (isEstimado(target) && !(estimatedHours > 0)) { setEstHours(""); setEstOpen(true); }
    // Persistimos y refrescamos para reflejar el recálculo del estado del sprint.
    await updateRequirementField(requirementId, "status_id", nextId);
    router.refresh();
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    // 0 con horas ya registradas = no hay nada más para cargar.
    if (!(Number(hours) > 0)) { setFinalOpen(false); return; }
    setSaving(true);
    const res = await quickLogHours(requirementId, sprintId, Number(hours));
    setSaving(false);
    if (res.ok) {
      setFinalOpen(false);
      setHours("");
      router.refresh();
    }
  }

  async function saveEstimated(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await updateEstimatedHours(requirementId, Number(estHours));
    setSaving(false);
    if (res.ok) {
      setEstOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <select
        value={current}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ borderColor: `${color}55`, color }}
        className="h-8 max-w-[150px] rounded-lg border bg-white px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      >
        {current === "" && (
          <option value="" disabled style={{ color: "#0F172A" }}>
            Sin estado
          </option>
        )}
        {statuses.map((s) => (
          <option key={s.id} value={s.id} style={{ color: "#0F172A" }}>
            {s.name}
          </option>
        ))}
      </select>

      <Modal open={finalOpen} onClose={() => setFinalOpen(false)} title="Horas reales al finalizar">
        <form onSubmit={saveHours} className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted">
            {hasLogged
              ? `Ya hay ${formatHours(consumedHours)} registradas (estimado ${formatHours(estimatedHours)}). Si quedaron horas sin cargar, ingresalas; si no, dejá 0.`
              : "Por defecto se cargan las horas estimadas. Podés ajustarlas."}
          </p>
          <div>
            <Label>{hasLogged ? "Horas adicionales" : "Horas reales"}</Label>
            <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving && <Loader2 size={15} className="animate-spin" />} Guardar horas</Button>
          </div>
        </form>
      </Modal>

      <Modal open={estOpen} onClose={() => setEstOpen(false)} title="Horas estimadas">
        <form onSubmit={saveEstimated} className="space-y-3" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}
