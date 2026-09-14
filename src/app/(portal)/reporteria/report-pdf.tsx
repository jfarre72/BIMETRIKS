"use client";

import { useMemo, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Button, Card, CardBody, Input, Label } from "@/components/ui";
import { formatHours, formatDate } from "@/lib/utils";

export type ReportReq = {
  code: string;
  title: string;
  area: string;
  status: string;
  statusColor: string;
  estimated: number;
  consumed: number;
  sprint: string;
  updatedAt: string;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function weekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // lunes = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoDate(monday), to: isoDate(sunday) };
}

export function ReportPdf({
  clientName,
  requirements,
  hours,
}: {
  clientName: string;
  requirements: ReportReq[];
  hours: { contracted: number; consumed: number; available: number };
}) {
  const initial = weekRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [all, setAll] = useState(false);

  const filtered = useMemo(() => {
    if (all) return requirements;
    return requirements.filter((r) => {
      const d = r.updatedAt.slice(0, 10);
      return d >= from && d <= to;
    });
  }, [requirements, from, to, all]);

  return (
    <>
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Desde</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={all} />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={all} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-muted">
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4 rounded border-line text-brand" />
                Todos (sin filtro de semana)
              </label>
            </div>
            <Button onClick={() => window.print()}>
              <FileDown size={16} /> Generar PDF
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            <Printer size={12} className="mb-0.5 mr-1 inline" />
            {filtered.length} requerimiento(s) en el período. Se abre el diálogo de impresión: elegí “Guardar como PDF”.
          </p>
        </CardBody>
      </Card>

      {/* Área imprimible (solo visible al imprimir) */}
      <div className="print-area">
        <div style={{ borderBottom: "2px solid #0B1E3F", paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3F" }}>BiMetriks · Portal de Proyectos</div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>Cliente: {clientName}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
            Reporte de requerimientos {all ? "(todos)" : `· ${formatDate(from)} a ${formatDate(to)}`} · emitido {formatDate(new Date())}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 12, color: "#334155" }}>
          <div>Horas contratadas: <b>{formatHours(hours.contracted)}</b></div>
          <div>Consumidas: <b>{formatHours(hours.consumed)}</b></div>
          <div>Disponibles: <b>{formatHours(hours.available)}</b></div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #CBD5E1", color: "#475569" }}>
              <th style={{ padding: "6px 8px" }}>ID</th>
              <th style={{ padding: "6px 8px" }}>Título</th>
              <th style={{ padding: "6px 8px" }}>Área</th>
              <th style={{ padding: "6px 8px" }}>Sprint</th>
              <th style={{ padding: "6px 8px" }}>Estado</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Est.</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Cons.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#1E5EFF" }}>{r.code}</td>
                <td style={{ padding: "6px 8px" }}>{r.title}</td>
                <td style={{ padding: "6px 8px" }}>{r.area}</td>
                <td style={{ padding: "6px 8px" }}>{r.sprint}</td>
                <td style={{ padding: "6px 8px" }}>
                  <span style={{ color: r.statusColor, fontWeight: 600 }}>● </span>{r.status}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatHours(r.estimated)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatHours(r.consumed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>No hay requerimientos en el período seleccionado.</p>
        )}
      </div>
    </>
  );
}
