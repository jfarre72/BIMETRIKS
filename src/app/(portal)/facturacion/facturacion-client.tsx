"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { formatHours, formatDate } from "@/lib/utils";
import { toggleContractedFlag } from "@/lib/actions";
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
  const [invoiced, setInvoiced] = useState(block.invoiced);
  const [paid, setPaid] = useState(block.paid);
  const [, startTransition] = useTransition();

  function toggle(field: "invoiced" | "paid", value: boolean) {
    if (field === "invoiced") setInvoiced(value);
    else setPaid(value);
    startTransition(async () => {
      await toggleContractedFlag(block.id, field, value);
      router.refresh();
    });
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
    </tr>
  );
}
