"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Input, EmptyState } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/shared/req-badges";
import { formatHours } from "@/lib/utils";
import type { Requirement } from "@/lib/types";

export function TrackingSelector({ requirements }: { requirements: Requirement[] }) {
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
          <Input className="pl-9" placeholder="Buscar requerimiento por ID o título…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Sin resultados" description="Probá con otro término de búsqueda." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <Link key={r.id} href={`/tracking/${r.id}`}>
              <Card className="p-4 transition-shadow hover:shadow-float">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-brand">{r.code}</span>
                    <p className="mt-0.5 truncate font-medium text-ink">{r.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular text-sm font-medium">{formatHours(r.consumed_hours)}</span>
                    <ArrowRight size={16} className="text-muted" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
