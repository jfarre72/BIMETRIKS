"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Input, EmptyState } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/shared/req-badges";
import { formatHours } from "@/lib/utils";
import type { Requirement } from "@/lib/types";

export function TrackingSelector({ requirements }: { requirements: Requirement[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => requirements.filter((r) => `${r.code} ${r.title}`.toLowerCase().includes(q.toLowerCase())),
    [requirements, q]
  );

  return (
    <div>
      <PageHeader title="Tracking" subtitle="Seguimiento detallado de requerimientos" />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Buscar requerimiento por ID o título…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Sin resultados" description="Probá con otro término de búsqueda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Área</th>
                  <th className="px-3 py-3">Prioridad</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Sprint</th>
                  <th className="px-3 py-3 text-right">Est.</th>
                  <th className="px-3 py-3 text-right">Cons.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/tracking/${r.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-brand">
                      <Link href={`/tracking/${r.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-medium text-ink">{r.title}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{r.area?.name ?? "—"}</td>
                    <td className="px-3 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{r.sprint?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular text-muted">{formatHours(r.estimated_hours)}</td>
                    <td className="px-3 py-3 text-right tabular font-medium">{formatHours(r.consumed_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
