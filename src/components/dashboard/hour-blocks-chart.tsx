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
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import type { HourBlock } from "@/lib/queries";

const AXIS = { fontSize: 12, fill: "#64748B" };

/** Horas por bloque de contratación (consumo asignado FIFO). */
export function HourBlocksChart({ blocks }: { blocks: HourBlock[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas por bloque</CardTitle>
        <span className="text-xs text-muted">consumo asignado FIFO (primero el bloque más antiguo)</span>
      </CardHeader>
      <CardBody>
        {blocks.length === 0 ? (
          <EmptyState title="Sin bloques" description="Registrá horas contratadas en la sección Horas." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={blocks} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F7F9FC" }} formatter={(v: any) => `${v} h`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="consumed" name="Consumidas" stackId="h" fill="#1E5EFF" />
              <Bar dataKey="available" name="Disponibles" stackId="h" fill="#6FBF3B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
