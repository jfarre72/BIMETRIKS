import { cn } from "@/lib/utils";

/** Logo BiMetriks: rayo + wordmark + bajada "Portal de Proyectos". */
export function Logo({
  variant = "dark",
  showTagline = true,
  className,
}: {
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}) {
  const text = variant === "light" ? "text-white" : "text-navy";
  const bi = variant === "light" ? "text-white" : "text-navy";
  const metriks = variant === "light" ? "text-sky" : "text-brand";
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2">
        <BoltMark />
        <span className={cn("text-xl font-bold tracking-tight", text)}>
          <span className={bi}>Bi</span>
          <span className={metriks}>Metriks</span>
        </span>
      </div>
      {showTagline && (
        <div className="mt-1 flex items-center gap-2 pl-9">
          <span className="h-px w-4 bg-lime" />
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              variant === "light" ? "text-white/70" : "text-muted"
            )}
          >
            Portal de Proyectos
          </span>
        </div>
      )}
    </div>
  );
}

function BoltMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-sky text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
      </svg>
    </span>
  );
}
