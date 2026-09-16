"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/sheet";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { saveRequirement, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import type { Catalogs, Requirement } from "@/lib/types";

export function RequirementForm({
  open,
  onClose,
  catalogs,
  requirement,
  onSaved,
  clientMode = false,
}: {
  open: boolean;
  onClose: () => void;
  catalogs: Catalogs;
  requirement?: Requirement | null;
  /** Permite a la vista actualizar el listado de inmediato (inserción optimista). */
  onSaved?: (req: Requirement, isEdit: boolean) => void;
  /** Rol CLIENT: formulario reducido (sólo carga; el staff prioriza). */
  clientMode?: boolean;
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
    // Actualización optimista del listado (evita esperar el refresh del server).
    if (res.id && onSaved) {
      onSaved(buildOptimistic(requirement ?? null, fd, catalogs, res.id, res.code ?? requirement?.code ?? "…"), isEdit);
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
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-4xl"
      title={isEdit ? `Editar ${requirement?.code}` : "Nuevo requerimiento"}
    >
      {!isEdit && <p className="-mt-2 mb-4 text-sm text-muted">El ID (REQ-####) se genera automáticamente.</p>}
      <form ref={formRef} onSubmit={onSubmit}>
        {isEdit && <input type="hidden" name="id" defaultValue={requirement?.id} />}

        {/* Grilla horizontal: aprovecha el ancho para no scrollear verticalmente. */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <Label>Título *</Label>
            <Input name="title" required defaultValue={requirement?.title ?? ""} placeholder="Ej: Cuadrar m² despachados" />
          </div>

          <Field label="Área / Capítulo">
            <Select name="area_id" defaultValue={requirement?.area_id ?? ""}>
              <option value="">—</option>
              {catalogs.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Página / Módulo">
            <Input name="module" defaultValue={requirement?.module ?? ""} />
          </Field>
          <Field label="Dashboard">
            <Input name="dashboard" defaultValue={requirement?.dashboard ?? ""} placeholder="¿En qué dashboard y página?" />
          </Field>

          {clientMode ? (
            // El cliente ve estos campos fijos (los define el staff al priorizar).
            <>
              <Field label="Estado">
                <Input value="Nuevo" disabled readOnly className="cursor-not-allowed bg-canvas text-muted" />
              </Field>
              <Field label="Sprint">
                <Input value="Sin asignar" disabled readOnly className="cursor-not-allowed bg-canvas text-muted" />
              </Field>
              <Field label="Horas estimadas">
                <Input placeholder="—" disabled readOnly className="cursor-not-allowed bg-canvas text-muted" />
              </Field>
            </>
          ) : (
            // Campos de gestión: sólo staff.
            <>
              <Field label="Sprint">
                <Select name="sprint_id" defaultValue={requirement?.sprint?.id ?? ""}>
                  <option value="">Sin asignar</option>
                  {catalogs.sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
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
              <Field label="Horas estimadas">
                <Input name="estimated_hours" type="number" step="0.5" min="0" defaultValue={requirement?.estimated_hours ?? 0} />
              </Field>
            </>
          )}

          <div className="md:col-span-3 lg:col-span-3">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-2">
              <div>
                <Label>Descripción</Label>
                <Textarea name="description" rows={3} defaultValue={requirement?.description ?? ""} />
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea name="observations" rows={3} defaultValue={requirement?.observations ?? ""} />
              </div>
            </div>
          </div>

          {/* Adjuntos (sólo staff: el CLIENT no tiene permisos de storage) */}
          {!clientMode && (
          <div className="md:col-span-3">
            <Label>Imágenes / archivos</Label>
            <div
              tabIndex={0}
              onPaste={onPaste}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`flex items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-3 text-center text-sm ${dragOver ? "border-brand bg-brand/5" : "border-line bg-canvas/50"}`}
            >
              <Upload size={16} className="text-muted" />
              <span className="text-muted">
                Arrastrá, pegá (Ctrl+V) o{" "}
                <label className="cursor-pointer font-medium text-brand">
                  elegí archivos
                  <input type="file" multiple accept="image/*,.pdf,.xlsx,.csv,.docx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
                </label>
              </span>
            </div>
            {files.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-1 lg:grid-cols-3">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-canvas px-2 py-1 text-xs">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red-600"><X size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear requerimiento"}
          </Button>
        </div>
      </form>
    </Modal>
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

/** Arma un Requirement a partir de los valores del formulario y los catálogos,
 *  para reflejar el alta/edición en el listado sin esperar al servidor. */
function buildOptimistic(
  base: Requirement | null,
  fd: FormData,
  catalogs: Catalogs,
  id: string,
  code: string
): Requirement {
  const v = (k: string) => {
    const val = fd.get(k);
    return val === null || val === "" ? null : String(val);
  };
  const find = <T extends { id: string }>(arr: T[], id: string | null) => (id ? arr.find((x) => x.id === id) ?? null : null);
  const sprintId = v("sprint_id");
  const sprint = sprintId ? catalogs.sprints.find((s) => s.id === sprintId) : null;
  const now = new Date().toISOString();
  return {
    id,
    code,
    title: v("title") ?? "",
    description: v("description"),
    module: v("module"),
    dashboard: v("dashboard"),
    estimated_hours: Number(v("estimated_hours") ?? 0),
    observations: v("observations"),
    sort_index: base?.sort_index ?? Number.MAX_SAFE_INTEGER,
    area_id: v("area_id"),
    type_id: v("type_id"),
    priority_id: v("priority_id"),
    status_id: v("status_id"),
    assignee_id: v("assignee_id"),
    validator_id: v("validator_id"),
    created_at: base?.created_at ?? now,
    updated_at: now,
    area: find(catalogs.areas, v("area_id")) as any,
    type: find(catalogs.types, v("type_id")) as any,
    priority: find(catalogs.priorities, v("priority_id")) as any,
    status: find(catalogs.statuses, v("status_id")) as any,
    assignee: find(catalogs.people, v("assignee_id")) as any,
    validator: find(catalogs.people, v("validator_id")) as any,
    consumed_hours: base?.consumed_hours ?? 0,
    sprint: sprint ? { id: sprint.id, name: sprint.name } : null,
  };
}
