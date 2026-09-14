"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { saveRequirement, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setFiles([]);
      formRef.current?.reset();
    }
  }, [open, requirement]);

  async function uploadFiles(reqId: string) {
    if (files.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
      const path = `${reqId}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("attachments").upload(path, file);
      if (up.error) continue;
      await supabase.from("requirement_attachments").insert({
        requirement_id: reqId, path, name: file.name, mime: file.type, size: file.size, created_by: user?.id ?? null,
      });
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res: ActionResult = await saveRequirement(null, fd);
    if (!res.ok) {
      setPending(false);
      setError(res.error ?? "No se pudo guardar");
      return;
    }
    if (res.id) await uploadFiles(res.id);
    setPending(false);
    onClose();
    router.refresh();
  }

  function addFiles(list: FileList | File[]) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }
  function onPaste(e: React.ClipboardEvent) {
    const f = Array.from(e.clipboardData.files);
    if (f.length) { e.preventDefault(); addFiles(f); }
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
              {catalogs.people.map((p) => <option key={p.id} value={p.id}>{p.role ? `${p.name} · ${p.role}` : p.name}</option>)}
            </Select>
          </Field>
          <Field label="Responsable de validación">
            <Select name="validator_id" defaultValue={requirement?.validator_id ?? ""}>
              <option value="">—</option>
              {catalogs.people.map((p) => <option key={p.id} value={p.id}>{p.role ? `${p.name} · ${p.role}` : p.name}</option>)}
            </Select>
          </Field>
        </div>

        <div>
          <Label>Observaciones</Label>
          <Textarea name="observations" rows={2} defaultValue={requirement?.observations ?? ""} />
        </div>

        {/* Adjuntos */}
        <div>
          <Label>Imágenes / archivos</Label>
          <div
            tabIndex={0}
            onPaste={onPaste}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center text-sm ${dragOver ? "border-brand bg-brand/5" : "border-line bg-canvas/50"}`}
          >
            <Upload size={18} className="text-muted" />
            <span className="text-muted">
              Arrastrá, pegá (Ctrl+V) o{" "}
              <label className="cursor-pointer font-medium text-brand">
                elegí archivos
                <input type="file" multiple accept="image/*,.pdf,.xlsx,.csv,.docx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
              </label>
            </span>
          </div>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-canvas px-2 py-1 text-xs">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red-600"><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
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
