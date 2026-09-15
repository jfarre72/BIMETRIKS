import { cn } from "@/lib/utils";

/** Logo BiMetriks: wordmark en texto (blanco/navy), grande, con fuente de logo. */
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
      <span
        className={cn("font-logo text-2xl font-bold leading-none tracking-tight", wordmark)}
        style={{ fontFamily: "var(--font-logo), var(--font-inter), sans-serif" }}
      >
        BiMetriks
      </span>
      {showTagline && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-px w-4 shrink-0 bg-lime" />
          <span
            className={cn(
              "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em]",
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
