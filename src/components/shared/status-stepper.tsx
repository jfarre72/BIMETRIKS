"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { updateRequirementField, quickLogHours } from "@/lib/actions";
import { Badge, Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import type { ReqStatus } from "@/lib/types";

/** Cambia el estado al anterior/siguiente con un clic. Al llegar a un estado
 *  final abre el registro de horas reales (default = estimadas). */
export function StatusStepper({
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
  const [isPending, startTransition] = useTransition();
  const [finalOpen, setFinalOpen] = useState(false);
  const [hours, setHours] = useState(String(estimatedHours || ""));
  const [saving, setSaving] = useState(false);

  const idx = statuses.findIndex((s) => s.id === value);
  const current = statuses[idx];
  const prev = idx > 0 ? statuses[idx - 1] : null;
  const next = idx >= 0 && idx < statuses.length - 1 ? statuses[idx + 1] : null;

  function go(target: ReqStatus | null) {
    if (!target) return;
    startTransition(async () => {
      await updateRequirementField(requirementId, "status_id", target.id);
      router.refresh();
    });
    if (target.is_final) {
      setHours(String(estimatedHours || ""));
      setFinalOpen(true);
    }
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await quickLogHours(requirementId, sprintId, Number(hours));
    setSaving(false);
    setFinalOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button
        onClick={() => go(prev)}
        disabled={!prev || isPending}
        className="rounded-md border border-line p-1 text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        aria-label="Estado anterior"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[110px] text-center">
        {current ? <Badge color={current.color}>{current.name}</Badge> : <Badge>Sin estado</Badge>}
      </span>
      <button
        onClick={() => go(next)}
        disabled={!next || isPending}
        className="rounded-md border border-line p-1 text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        aria-label="Estado siguiente"
      >
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
    </div>
  );
}
