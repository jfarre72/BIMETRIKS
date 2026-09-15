"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { HourBlocksChart } from "@/components/dashboard/hour-blocks-chart";
import { ReportPdf, type ReportReq, type SprintReport } from "./report-pdf";
import { formatHours, formatDateShort } from "@/lib/utils";
import type { HourBlock } from "@/lib/queries";

const AXIS = { fontSize: 12, fill: "#64748B" };

export function ReporteriaClient({
  hours,
  byStatus,
  evolution,
  blocks,
  totals,
  clientName,
  reportReqs,
  sprintReport,
}: {
  hours: { contracted: number; consumed: number; available: number };
  byStatus: { name: string; color: string; value: number }[];
  evolution: { date: string; acumulado: number }[];
  blocks: HourBlock[];
  totals: { total: number; finalized: number; pending: number };
  clientName: string;
  reportReqs: ReportReq[];
  sprintReport: SprintReport[];
}) {
  const contractedVsConsumed = [
    { name: "Contratadas", horas: hours.contracted },
    { name: "Utilizadas", horas: hours.consumed },
    { name: "Disponibles", horas: hours.available },
  ];

  return (
    <div>
      <PageHeader title="Reportería" subtitle="Reportes ejecutivos del servicio" />

      <ReportPdf clientName={clientName} requirements={reportReqs} hours={hours} sprintReport={sprintReport} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requerimientos" value={totals.total} accent="#0B1E3F" />
        <StatCard label="Finalizados" value={totals.finalized} accent="#16A34A" />
        <StatCard label="Pendientes" value={totals.pending} accent="#CA8A04" />
        <StatCard label="Horas utilizadas" value={formatHours(hours.consumed)} accent="#1E5EFF" />
      </div>

      <div className="mb-4">
        <HourBlocksChart blocks={blocks} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Horas contratadas vs utilizadas">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contractedVsConsumed} barSize={54}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F7F9FC" }} />
              <Bar dataKey="horas" radius={[8, 8, 0, 0]}>
                {contractedVsConsumed.map((_, i) => (
                  <Cell key={i} fill={["#0B1E3F", "#1E5EFF", "#16A34A"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolución del consumo de horas">
          {evolution.length === 0 ? (
            <EmptyState title="Sin datos" description="Aún no hay horas registradas." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={evolution}>
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E5EFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1E5EFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="date" tickFormatter={(d) => formatDateShort(d)} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={(d) => formatDateShort(d as string)} />
                <Area type="monotone" dataKey="acumulado" stroke="#1E5EFF" strokeWidth={2} fill="url(#area)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Requerimientos por estado">
          {byStatus.length === 0 ? (
            <EmptyState title="Sin requerimientos" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
