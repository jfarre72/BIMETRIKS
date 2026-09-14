"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { Button, Input, Textarea, Label } from "@/components/ui";
import { Modal } from "@/components/ui/sheet";
import { addTimeEntry } from "@/lib/actions";

export function LogHoursButton({ requirementId, sprintId }: { requirementId: string; sprintId?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await addTimeEntry(null, new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Clock size={15} /> Registrar horas</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar horas">
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="requirement_id" value={requirementId} />
          {sprintId && <input type="hidden" name="sprint_id" value={sprintId} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" name="entry_date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <Label>Horas</Label>
              <Input type="number" name="hours" step="0.25" min="0.25" placeholder="2" required />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea name="description" rows={2} placeholder="Trabajo realizado…" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Guardar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
