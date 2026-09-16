"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";

/**
 * Flujo de requerimientos por estado: muestra todos los estados de izquierda a
 * derecha (en el orden del catálogo, hasta "Finalizado"), con la cantidad de
 * requerimientos arriba del nombre de cada estado y flechas que dan sensación
 * de avance. Reemplaza a la antigua torta de estados.
 */
export function StatusFlow({
  data,
  total,
}: {
  data: { name: string; color: string; value: number }[];
  total: number;
}) {
  const max = Math.max(1, ...data.map((s) => s.value));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Flujo de requerimientos por estado</CardTitle>
        <Badge>{total} total</Badge>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState title="Sin requerimientos" description="Creá el primero en el Backlog." />
        ) : (
          <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
            {data.map((s, i) => (
              <div key={s.name} className="flex items-stretch">
                <div className="flex min-w-[92px] flex-col items-center text-center">
                  {/* Cantidad arriba del nombre */}
                  <span className="text-2xl font-semibold leading-none text-ink" style={{ color: s.color }}>
                    {s.value}
                  </span>
                  <span className="mt-1 text-[11px] text-muted">
                    {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                  </span>

                  {/* Barra proporcional para reforzar el volumen relativo */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(s.value / max) * 100}%`, backgroundColor: s.color }}
                    />
                  </div>

                  {/* Nombre del estado */}
                  <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </div>

                {/* Flecha de flujo entre estados */}
                {i < data.length - 1 && (
                  <div className="flex items-start pt-1 text-muted/50" aria-hidden>
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
