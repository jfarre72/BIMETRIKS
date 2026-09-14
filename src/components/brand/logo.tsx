import { cn } from "@/lib/utils";

/** Logo BiMetriks: marca de dos flechas (verde) + wordmark + bajada. */
export function Logo({
  variant = "dark",
  showTagline = true,
  className,
}: {
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}) {
  const wordmark = variant === "light" ? "text-white" : "text-navy";
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2.5">
        <ArrowsMark />
        <span className={cn("text-xl font-bold tracking-tight", wordmark)}>BiMetriks</span>
      </div>
      {showTagline && (
        <div className="mt-1 flex items-center gap-2 pl-[42px]">
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

/** Dos flechas en verde (subiendo y bajando), estilo isotipo BiMetriks. */
function ArrowsMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Flecha superior (sube a la derecha) */}
      <path
        d="M6 14 L20 14 M20 14 L20 20 M20 14 L26 8 M26 8 L20 8 M26 8 L26 14"
        stroke="#6FBF3B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flecha inferior (baja a la izquierda) */}
      <path
        d="M26 18 L12 18 M12 18 L12 12 M12 18 L6 24 M6 24 L12 24 M6 24 L6 18"
        stroke="#4E9A2E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
