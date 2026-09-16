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
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
  className?: string;
  /** Versión más chica para dashboards densos (menos padding y tipografía). */
  compact?: boolean;
}) {
  return (
    <Card className={cn(compact ? "p-3.5" : "p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("font-medium uppercase tracking-wide text-muted", compact ? "text-[11px]" : "text-xs")}>{label}</p>
          <p className={cn("font-semibold text-ink tabular", compact ? "mt-1 text-xl" : "mt-2 text-2xl")}>{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn("flex items-center justify-center rounded-xl", compact ? "h-8 w-8" : "h-10 w-10")}
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
