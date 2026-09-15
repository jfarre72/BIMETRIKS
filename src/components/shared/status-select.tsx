"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateRequirementField, quickLogHours } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import type { ReqStatus } from "@/lib/types";

/** Select inline para cambiar el estado. Al pasar a un estado "final" abre un
 *  modal para cargar las horas reales (que quedan registradas en el sprint). */
export function StatusSelect({
  requirementId,
  value,
  statuses,
  sprintId = null,
  estimatedHours = 0,
}: {
  requirementId: string;
  value: string | null;
  statuses: ReqStatus[];
  sprintId?: string | null;
  estimatedHours?: number;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [finalOpen, setFinalOpen] = useState(false);
  const [hours, setHours] = useState(String(estimatedHours || ""));
  const [saving, setSaving] = useState(false);
  const color = statuses.find((s) => s.id === current)?.color ?? "#64748B";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const isFinal = statuses.find((s) => s.id === next)?.is_final;
    setCurrent(next); // instantáneo
    void updateRequirementField(requirementId, "status_id", next); // en segundo plano
    if (isFinal) { setHours(String(estimatedHours || "")); setFinalOpen(true); }
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await quickLogHours(requirementId, sprintId, Number(hours));
    setSaving(false);
    if (res.ok) {
      setFinalOpen(false);
      setHours("");
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
        {statuses.map((s) => (
          <option key={s.id} value={s.id} style={{ color: "#0F172A" }}>
            {s.name}
          </option>
        ))}
      </select>

      <Modal open={finalOpen} onClose={() => setFinalOpen(false)} title="Horas reales al finalizar">
        <form onSubmit={saveHours} className="space-y-3" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}
