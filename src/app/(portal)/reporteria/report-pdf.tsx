"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FileDown, Printer } from "lucide-react";
import { Button, Card, CardBody, Input, Label, Select } from "@/components/ui";
import { formatHours, formatDate, pct } from "@/lib/utils";
import { setSprintContractedHours } from "@/lib/actions";

export type SprintReqRow = {
  code: string;
  title: string;
  area: string;
  status: string;
  statusColor: string;
  estimated: number;
  consumed: number;
};

export type SprintReport = {
  id: string;
  name: string;
  status: string | null;
  startDate: string | null;
  targetDate: string | null;
  /** Horas contratadas para el sprint (null = sin cargar). */
  contracted: number | null;
  estimated: number;
  consumed: number;
  requirements: SprintReqRow[];
};

/** Torta (donut) SVG del uso del sprint: utilizadas / contratadas (puede pasar de 100%). */
function HoursDonut({ consumed, contracted }: { consumed: number; contracted: number }) {
  const percent = pct(consumed, contracted);
  const over = percent > 100;
  const r = 34;
  const C = 2 * Math.PI * r;
  const consumedLen = C * Math.min(percent, 100) / 100;
  return (
    <svg width={92} height={92} viewBox="0 0 92 92">
      <g transform="translate(46,46) rotate(-90)">
        <circle r={r} fill="none" stroke="#16A34A" strokeWidth={12} />
        <circle r={r} fill="none" stroke={over ? "#DC2626" : "#1E5EFF"} strokeWidth={12} strokeDasharray={`${consumedLen} ${C - consumedLen}`} />
      </g>
      <text x={46} y={46} textAnchor="middle" fontSize={15} fontWeight={700} fill={over ? "#DC2626" : "#0B1E3F"}>
        {percent}%
      </text>
      <text x={46} y={59} textAnchor="middle" fontSize={8} fill="#64748B">
        utilizado
      </text>
    </svg>
  );
}

function Kpi({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#334155" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}: <b>{value}</b>
    </div>
  );
}

const TH: React.CSSProperties = { padding: "4px 6px", fontWeight: 600 };
const TD: React.CSSProperties = { padding: "3px 6px", verticalAlign: "top" };

export function ReportPdf({
  clientName,
  sprintReport,
  defaultSprintId,
}: {
  clientName: string;
  sprintReport: SprintReport[];
  defaultSprintId: string | null;
}) {
  const router = useRouter();
  const [sprintId, setSprintId] = useState(defaultSprintId ?? "");
  const sprint = sprintReport.find((s) => s.id === sprintId) ?? null;

  // Horas contratadas del sprint: si no están cargadas se piden en el input y
  // se guardan en el sprint al salir del campo.
  const [contractedInput, setContractedInput] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  useEffect(() => {
    setContractedInput(sprint?.contracted != null ? String(sprint.contracted) : "");
    setSaveState("idle");
  }, [sprint?.id, sprint?.contracted]);
  const parsed = contractedInput.trim() === "" ? null : Number(contractedInput.replace(",", "."));
  const contracted = parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  async function saveContracted() {
    if (!sprint || sprint.id === "none") return;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return setSaveState("error");
    if (parsed === sprint.contracted) return;
    setSaveState("saving");
    const res = await setSprintContractedHours(sprint.id, parsed);
    setSaveState(res.ok ? "idle" : "error");
    if (res.ok) router.refresh();
  }

  // El área imprimible va directo en <body> (portal): así al imprimir se oculta
  // el resto del portal con display:none y no quedan hojas en blanco.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const period =
    sprint && (sprint.startDate || sprint.targetDate)
      ? ` · ${formatDate(sprint.startDate)} a ${formatDate(sprint.targetDate)}`
      : "";

  const printable = (
    <div className="print-area">
      <div style={{ borderBottom: "2px solid #0B1E3F", paddingBottom: 8, marginBottom: 10, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0B1E3F" }}>BiMetriks · Portal de Proyectos</div>
          <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
            Cliente: <b>{clientName}</b> · Sprint: <b>{sprint?.name ?? "—"}</b>
            {sprint?.status ? ` (${sprint.status})` : ""}
            {period}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#64748B", whiteSpace: "nowrap" }}>Emitido {formatDate(new Date())}</div>
      </div>

      {/* Resumen del sprint: contratadas, estimadas, utilizadas, requerimientos y % de uso */}
      {sprint && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 10 }}>
          <HoursDonut consumed={sprint.consumed} contracted={contracted ?? 0} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748B" }}>Sprint</div>
            <Kpi color="#0B1E3F" label="Horas contratadas" value={contracted != null ? formatHours(contracted) : "—"} />
            <Kpi color="#8B5CF6" label="Horas estimadas" value={formatHours(sprint.estimated)} />
            <Kpi color="#1E5EFF" label="Horas utilizadas" value={formatHours(sprint.consumed)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 12, paddingLeft: 18, borderLeft: "1px solid #E2E8F0" }}>
            <Kpi color="#64748B" label="Total requerimientos" value={String(sprint.requirements.length)} />
            <Kpi
              color={contracted != null && pct(sprint.consumed, contracted) > 100 ? "#DC2626" : "#16A34A"}
              label="% utilizado"
              value={contracted != null ? `${pct(sprint.consumed, contracted)}%` : "—"}
            />
          </div>
        </div>
      )}

      {sprint && sprint.requirements.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, lineHeight: 1.3 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #CBD5E1", color: "#475569" }}>
              <th style={{ ...TH, whiteSpace: "nowrap" }}>ID</th>
              <th style={TH}>Título</th>
              <th style={TH}>Área</th>
              <th style={TH}>Estado</th>
              <th style={{ ...TH, textAlign: "right" }}>Est.</th>
              <th style={{ ...TH, textAlign: "right" }}>Cons.</th>
            </tr>
          </thead>
          <tbody>
            {sprint.requirements.map((r) => (
              <tr key={r.code} style={{ borderBottom: "1px solid #E2E8F0", pageBreakInside: "avoid" }}>
                <td style={{ ...TD, fontFamily: "monospace", color: "#1E5EFF", whiteSpace: "nowrap" }}>{r.code}</td>
                <td style={TD}>{r.title}</td>
                <td style={TD}>{r.area}</td>
                <td style={{ ...TD, whiteSpace: "nowrap" }}>
                  <span style={{ color: r.statusColor, fontWeight: 600 }}>● </span>{r.status}
                </td>
                <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>{formatHours(r.estimated)}</td>
                <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>{formatHours(r.consumed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: 11, color: "#64748B" }}>No hay requerimientos en el sprint seleccionado.</p>
      )}
    </div>
  );

  return (
    <>
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 sm:w-72">
              <Label>Sprint</Label>
              <Select value={sprintId} onChange={(e) => setSprintId(e.target.value)} disabled={sprintReport.length === 0}>
                {sprintReport.length === 0 && <option value="">Sin sprints con requerimientos</option>}
                {sprintReport.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.status ? ` · ${s.status}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 sm:w-56">
              <Label>Horas contratadas del sprint</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                placeholder="Ej: 5"
                value={contractedInput}
                onChange={(e) => { setContractedInput(e.target.value); if (saveState === "error") setSaveState("idle"); }}
                onBlur={saveContracted}
                disabled={!sprint}
                className={saveState === "error" ? "border-red-400" : undefined}
              />
            </div>
            <Button onClick={() => window.print()} disabled={!sprint || contracted == null}>
              <FileDown size={16} /> Generar PDF
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            <Printer size={12} className="mb-0.5 mr-1 inline" />
            {sprint?.requirements.length ?? 0} requerimiento(s) en el sprint. Se abre el diálogo de impresión: elegí “Guardar como PDF”.
            {sprint && contracted == null && <span className="ml-1 font-medium text-amber-700">Cargá las horas contratadas del sprint para generar el PDF.</span>}
            {saveState === "saving" && <span className="ml-1">Guardando…</span>}
            {saveState === "error" && <span className="ml-1 text-red-600">No se pudieron guardar las horas.</span>}
          </p>
        </CardBody>
      </Card>

      {mounted && createPortal(printable, document.body)}
    </>
  );
}
