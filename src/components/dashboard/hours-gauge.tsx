import { pct, formatHours } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui";

/** Anillo de consumo de horas (SVG puro, sin librería). */
export function HoursGauge({
  contracted,
  consumed,
  available,
}: {
  contracted: number;
  consumed: number;
  available: number;
}) {
  const percentage = pct(consumed, contracted);
  const r = 66;
  const circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
          <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90">
            <circle cx="88" cy="88" r={r} fill="none" stroke="#E6EBF2" strokeWidth="14" />
            <circle
              cx="88"
              cy="88"
              r={r}
              fill="none"
              stroke="url(#g)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E5EFF" />
                <stop offset="100%" stopColor="#4FB2F0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold text-ink tabular">{percentage}%</span>
            <span className="text-xs text-muted">utilizado</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 sm:max-w-xs">
          <Metric label="Contratadas" value={formatHours(contracted)} color="#0B1E3F" />
          <Metric label="Utilizadas" value={formatHours(consumed)} color="#1E5EFF" />
          <Metric label="Disponibles" value={formatHours(available)} color="#16A34A" />
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3 text-center">
      <p className="text-lg font-semibold tabular" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
