"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/sheet";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { saveSprint } from "@/lib/actions";
import type { Sprint } from "@/lib/types";

const STATUSES = ["Planificado", "Activo", "Finalizado", "Pausado"] as const;

export function SprintForm({ open, onClose, sprint }: { open: boolean; onClose: () => void; sprint?: Sprint | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await saveSprint(null, new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar");
    onClose();
    router.refresh();
  }

  const isEdit = Boolean(sprint?.id);

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" title={isEdit ? "Editar sprint" : "Nuevo sprint"}>
      <form onSubmit={onSubmit}>
        {isEdit && <input type="hidden" name="id" defaultValue={sprint?.id} />}

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nombre *</Label>
            <Input name="name" required defaultValue={sprint?.name ?? ""} placeholder="Ej: Sprint 01 · Nivel de Servicio" />
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea name="description" rows={2} defaultValue={sprint?.description ?? ""} />
          </div>
          <div>
            <Label>Fecha de inicio</Label>
            <Input type="date" name="start_date" defaultValue={sprint?.start_date ?? ""} />
          </div>
          <div>
            <Label>Fecha objetivo</Label>
            <Input type="date" name="target_date" defaultValue={sprint?.target_date ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>Estado</Label>
            <Select name="status" defaultValue={sprint?.status ?? "Planificado"}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
