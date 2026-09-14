"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";

export function StatusDonut({
  data,
  total,
}: {
  data: { name: string; color: string; value: number }[];
  total: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Requerimientos por estado</CardTitle>
        <Badge>{total} total</Badge>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState title="Sin requerimientos" description="Creá el primero en el Backlog." />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart margin={{ top: 4, bottom: 4 }}>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {data.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
