"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { saveRequirement, type ActionResult } from "@/lib/actions";
import type { Catalogs, Requirement } from "@/lib/types";

export function RequirementForm({
  open,
  onClose,
  catalogs,
  requirement,
}: {
  open: boolean;
  onClose: () => void;
  catalogs: Catalogs;
  requirement?: Requirement | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      formRef.current?.reset();
    }
  }, [open, requirement]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res: ActionResult = await saveRequirement(null, fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar");
      return;
    }
    onClose();
    router.refresh();
  }

  const isEdit = Boolean(requirement?.id);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar ${requirement?.code}` : "Nuevo requerimiento"}
      description={isEdit ? undefined : "El ID (REQ-####) se genera automáticamente."}
      width="max-w-xl"
    >
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        {isEdit && <input type="hidden" name="id" defaultValue={requirement?.id} />}

        <div>
          <Label>Título *</Label>
          <Input name="title" required defaultValue={requirement?.title ?? ""} placeholder="Ej: Cuadrar m² despachados" />
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea name="description" rows={3} defaultValue={requirement?.description ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Área / Capítulo">
            <Select name="area_id" defaultValue={requirement?.area_id ?? ""}>
              <option value="">—</option>
              {catalogs.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Página / Módulo">
            <Input name="module" defaultValue={requirement?.module ?? ""} />
          </Field>
          <Field label="Tipo">
            <Select name="type_id" defaultValue={requirement?.type_id ?? ""}>
              <option value="">—</option>
              {catalogs.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select name="priority_id" defaultValue={requirement?.priority_id ?? ""}>
              <option value="">—</option>
              {catalogs.priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select name="status_id" defaultValue={requirement?.status_id ?? catalogs.statuses[0]?.id ?? ""}>
              <option value="">—</option>
              {catalogs.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Horas estimadas">
            <Input name="estimated_hours" type="number" step="0.5" min="0" defaultValue={requirement?.estimated_hours ?? 0} />
          </Field>
          <Field label="Responsable">
            <Select name="assignee_id" defaultValue={requirement?.assignee_id ?? ""}>
              <option value="">—</option>
              {catalogs.people.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username}</option>)}
            </Select>
          </Field>
          <Field label="Responsable de validación">
            <Select name="validator_id" defaultValue={requirement?.validator_id ?? ""}>
              <option value="">—</option>
              {catalogs.people.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username}</option>)}
            </Select>
          </Field>
        </div>

        <div>
          <Label>Observaciones</Label>
          <Textarea name="observations" rows={2} defaultValue={requirement?.observations ?? ""} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear requerimiento"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
