"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, FilePlus2, Loader2, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, CardBody, CardHeader, CardTitle, Input, Label, Select, Textarea, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/sheet";
import { formatHours, formatDate, pct } from "@/lib/utils";
import { addTimeEntry, addContractedHours, deleteTimeEntry, deleteContractedHours, updateContractedHours } from "@/lib/actions";
import type { ContractedHours, TimeEntry } from "@/lib/types";

type MiniReq = { id: string; code: string; title: string };
type MiniSprint = { id: string; name: string; status: string };

export function HorasClient({
  hours,
  contracted,
  entries,
  requirements,
  sprints,
}: {
  hours: { contracted: number; consumed: number; available: number };
  contracted: ContractedHours[];
  entries: TimeEntry[];
  requirements: MiniReq[];
  sprints: MiniSprint[];
}) {
  const router = useRouter();
  const [entryOpen, setEntryOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [editContract, setEditContract] = useState<ContractedHours | null>(null);

  async function onDeleteEntry(id: string) {
    if (!confirm("¿Eliminar este registro de horas?")) return;
    await deleteTimeEntry(id);
    router.refresh();
  }
  async function onDeleteContracted(id: string) {
    if (!confirm("¿Eliminar este bloque de horas contratadas?")) return;
    await deleteContractedHours(id);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Horas"
        subtitle="Gestión de horas contratadas y utilizadas"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setContractOpen(true)}><FilePlus2 size={16} /> Horas contratadas</Button>
            <Button onClick={() => setEntryOpen(true)}><Plus size={16} /> Registrar horas</Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Horas contratadas" value={formatHours(hours.contracted)} icon={<Clock size={18} />} accent="#0B1E3F" />
        <StatCard label="Horas utilizadas" value={formatHours(hours.consumed)} hint={`${pct(hours.consumed, hours.contracted)}% utilizado`} icon={<Clock size={18} />} accent="#1E5EFF" />
        <StatCard label="Horas disponibles" value={formatHours(hours.available)} icon={<Clock size={18} />} accent="#16A34A" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Registros de consumo */}
        <Card className="order-2">
          <CardHeader><CardTitle>Registros de horas</CardTitle><Badge>{entries.length}</Badge></CardHeader>
          <CardBody>
            {entries.length === 0 ? (
              <EmptyState title="Sin registros" description="Registrá el primer bloque de horas." />
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="px-3 py-2">Requerimiento</th>
                      <th className="px-3 py-2 text-right">Horas</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="group border-b border-line last:border-0">
                        <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{formatDate(e.entry_date)}</td>
                        <td className="px-3 py-2.5">
                          {e.requirement ? (
                            <span><span className="font-mono text-xs text-brand">{e.requirement.code}</span> · {e.description ?? e.requirement.title}</span>
                          ) : (
                            e.description ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular font-medium">{formatHours(e.hours)}</td>
                        <td className="pr-2 text-right">
                          <button onClick={() => onDeleteEntry(e.id)} className="rounded p-1 text-muted opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Historial de contratación */}
        <Card className="order-1">
          <CardHeader><CardTitle>Horas contratadas · historial</CardTitle><Badge>{contracted.length}</Badge></CardHeader>
          <CardBody>
            {contracted.length === 0 ? (
              <EmptyState title="Sin contratación" description="Registrá el primer bloque de horas contratadas." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="px-3 py-2">Observación</th>
                    <th className="px-3 py-2 text-right">Horas</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracted.map((c) => (
                    <tr key={c.id} className="group border-b border-line last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{formatDate(c.entry_date)}</td>
                      <td className="px-3 py-2.5">{c.note ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular font-medium text-green-600">+{formatHours(c.hours)}</td>
                      <td className="whitespace-nowrap pr-2 text-right">
                        <button onClick={() => setEditContract(c)} className="rounded p-1 text-muted opacity-0 hover:bg-canvas hover:text-ink group-hover:opacity-100" aria-label="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onDeleteContracted(c.id)} className="rounded p-1 text-muted opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line font-semibold">
                    <td colSpan={2} className="py-2.5 pr-3 text-right text-muted">Total</td>
                    <td className="px-3 py-2.5 text-right tabular">{formatHours(hours.contracted)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <TimeEntryModal open={entryOpen} onClose={() => setEntryOpen(false)} requirements={requirements} sprints={sprints} />
      <ContractedModal open={contractOpen} onClose={() => setContractOpen(false)} />
      <EditContractedModal block={editContract} onClose={() => setEditContract(null)} />
    </div>
  );
}

function TimeEntryModal({ open, onClose, requirements, sprints }: { open: boolean; onClose: () => void; requirements: MiniReq[]; sprints: MiniSprint[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError(null);
    const res = await addTimeEntry(null, new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar horas">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha</Label><Input type="date" name="entry_date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
          <div><Label>Horas</Label><Input type="number" name="hours" step="0.25" min="0.25" required /></div>
        </div>
        <div>
          <Label>Requerimiento *</Label>
          <Select name="requirement_id" required defaultValue=""><option value="" disabled>Elegí un requerimiento…</option>{requirements.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.title}</option>)}</Select>
        </div>
        <div>
          <Label>Sprint</Label>
          <Select name="sprint_id"><option value="">—</option>{sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </div>
        <div><Label>Descripción del trabajo</Label><Textarea name="description" rows={2} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Guardar</Button></div>
      </form>
    </Modal>
  );
}

function ContractedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError(null);
    const res = await addContractedHours(null, new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar horas contratadas">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha</Label><Input type="date" name="entry_date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
          <div><Label>Horas</Label><Input type="number" name="hours" step="1" min="1" placeholder="50" required /></div>
        </div>
        <div><Label>Observación</Label><Textarea name="note" rows={2} placeholder="Primer bloque de servicio" /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Guardar</Button></div>
      </form>
    </Modal>
  );
}

function EditContractedModal({ block, onClose }: { block: ContractedHours | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!block) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await updateContractedHours(block!.id, {
      entry_date: String(fd.get("entry_date")),
      hours: Number(fd.get("hours")),
      note: String(fd.get("note") ?? ""),
    });
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onClose(); router.refresh();
  }

  return (
    <Modal open onClose={onClose} title="Editar bloque contratado">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha</Label><Input type="date" name="entry_date" defaultValue={block.entry_date} required /></div>
          <div><Label>Horas</Label><Input type="number" name="hours" step="1" min="1" defaultValue={block.hours} required /></div>
        </div>
        <div><Label>Observación</Label><Textarea name="note" rows={2} defaultValue={block.note ?? ""} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Guardar</Button></div>
      </form>
    </Modal>
  );
}
