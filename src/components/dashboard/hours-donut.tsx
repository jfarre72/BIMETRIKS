"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { formatHours, pct } from "@/lib/utils";

/** Torta de horas: consumidas vs disponibles. */
export function HoursDonut({ consumed, available }: { consumed: number; available: number }) {
  const total = consumed + available;
  const data = [
    { name: "Horas utilizadas", value: consumed, color: "#1E5EFF" },
    { name: "Horas disponibles", value: available, color: "#16A34A" },
  ];
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Utilización de horas</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="relative">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart margin={{ top: 4, bottom: 4 }}>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatHours(Number(v))} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 top-[66px] text-center">
            <div className="text-2xl font-bold text-ink tabular">{pct(consumed, total)}%</div>
            <div className="text-xs text-muted">utilizado</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
