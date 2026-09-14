import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./index";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "#1E5EFF",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink tabular">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
