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
          <ResponsiveContainer width="100%" height={185}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {data.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
