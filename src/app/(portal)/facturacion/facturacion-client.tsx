"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { formatHours, formatDate } from "@/lib/utils";
import { toggleContractedFlag, setContractedInvoice } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import type { BillingBlock } from "@/lib/queries";

export function FacturacionClient({ blocks }: { blocks: BillingBlock[] }) {
  const totalContracted = blocks.reduce((a, b) => a + b.contracted, 0);
  const totalConsumed = blocks.reduce((a, b) => a + b.consumed, 0);
  const invoiced = blocks.filter((b) => b.invoiced).reduce((a, b) => a + b.contracted, 0);
  const paid = blocks.filter((b) => b.paid).reduce((a, b) => a + b.contracted, 0);

  return (
    <div>
      <PageHeader title="Facturación" subtitle="Estado de facturación y cobro por bloque de horas contratadas" />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Horas contratadas" value={formatHours(totalContracted)} accent="#0B1E3F" />
        <StatCard label="Horas utilizadas" value={formatHours(totalConsumed)} accent="#1E5EFF" />
        <StatCard label="Facturadas" value={formatHours(invoiced)} accent="#4E9A2E" />
        <StatCard label="Pagadas" value={formatHours(paid)} accent="#16A34A" />
      </div>

      <Card>
        <CardHeader><CardTitle>Bloques</CardTitle><Badge>{blocks.length}</Badge></CardHeader>
        <CardBody>
          {blocks.length === 0 ? (
            <EmptyState title="Sin bloques" description="Registrá horas contratadas en la sección Horas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Bloque</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Contratadas</th>
                    <th className="px-3 py-2 text-right">Utilizadas</th>
                    <th className="px-3 py-2 text-center">Facturadas</th>
                    <th className="px-3 py-2 text-center">Pagadas</th>
                    <th className="px-3 py-2">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b) => <Row key={b.id} block={b} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ block }: { block: BillingBlock }) {
  const router = useRouter();
  const supabase = createClient();
  const [invoiced, setInvoiced] = useState(block.invoiced);
  const [paid, setPaid] = useState(block.paid);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle(field: "invoiced" | "paid", value: boolean) {
    if (field === "invoiced") setInvoiced(value);
    else setPaid(value);
    startTransition(async () => {
      await toggleContractedFlag(block.id, field, value);
      router.refresh();
    });
  }

  async function uploadInvoice(file: File) {
    setBusy(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "factura";
    const path = `invoices/${block.id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("attachments").upload(path, file);
    if (!up.error) {
      await setContractedInvoice(block.id, path, file.name);
      if (!invoiced) { setInvoiced(true); await toggleContractedFlag(block.id, "invoiced", true); }
    }
    setBusy(false);
    router.refresh();
  }

  async function removeInvoice() {
    if (!confirm("¿Quitar la factura adjunta?")) return;
    setBusy(true);
    if (block.invoicePath) await supabase.storage.from("attachments").remove([block.invoicePath]);
    await setContractedInvoice(block.id, null, null);
    setBusy(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas/40">
      <td className="py-2.5 pr-3 font-medium text-ink">{block.label}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{formatDate(block.entry_date)}</td>
      <td className="px-3 py-2.5 text-right tabular">{formatHours(block.contracted)}</td>
      <td className="px-3 py-2.5 text-right tabular font-medium">{formatHours(block.consumed)}</td>
      <td className="px-3 py-2.5 text-center">
        <input type="checkbox" checked={invoiced} onChange={(e) => toggle("invoiced", e.target.checked)} className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30" />
      </td>
      <td className="px-3 py-2.5 text-center">
        <input type="checkbox" checked={paid} onChange={(e) => toggle("paid", e.target.checked)} className="h-4 w-4 rounded border-line text-green-600 focus:ring-green-500/30" />
      </td>
      <td className="px-3 py-2.5">
        {busy ? (
          <Loader2 size={15} className="animate-spin text-muted" />
        ) : block.invoicePath ? (
          <div className="flex items-center gap-2">
            <a href={block.invoiceUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <FileText size={14} /> {block.invoiceName ?? "Factura"}
            </a>
            <button onClick={removeInvoice} className="text-muted hover:text-red-600" aria-label="Quitar factura"><Trash2 size={13} /></button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted hover:bg-canvas hover:text-ink">
            <Upload size={13} /> Adjuntar
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadInvoice(e.target.files[0])} />
      </td>
    </tr>
  );
}
