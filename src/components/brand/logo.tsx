"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Logo BiMetriks. Si existe una imagen en /public (logo.svg o logo.png) la usa;
 * si no, cae en el isotipo dibujado. Para cargar tu logo oficial, subí el
 * archivo a la carpeta `public/` del repo con el nombre `logo.svg` (preferido,
 * fondo transparente) o `logo.png` (fondo transparente, ~200px de alto).
 */
// El logo es una franja horizontal (≈5.4:1). Se dimensiona por ANCHO para que
// llene el espacio sin dejar huecos verticales.
const SIZE_CLASS: Record<string, string> = {
  sm: "w-32",
  md: "w-40",
  lg: "w-52",
  xl: "w-full",
};

export function Logo({
  variant = "dark",
  showTagline = true,
  size = "md",
  className,
}: {
  variant?: "dark" | "light";
  showTagline?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = ["/logo.svg", "/logo.png"];
  const failed = srcIdx >= sources.length;
  const wordmark = variant === "light" ? "text-white" : "text-navy";

  return (
    <div className={cn("flex flex-col", className)}>
      {failed ? (
        <div className="flex items-center gap-2.5">
          <ArrowsMark />
          <span className={cn("text-3xl font-bold tracking-tight", wordmark)}>BiMetriks</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[srcIdx]}
          alt="BiMetriks"
          className={cn("h-auto max-w-full object-contain", SIZE_CLASS[size])}
          onError={() => setSrcIdx((i) => i + 1)}
        />
      )}
      {showTagline && (
        <div className="mt-1 flex items-center gap-2 pl-1">
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

function ArrowsMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 14 L20 14 M20 14 L20 20 M20 14 L26 8 M26 8 L20 8 M26 8 L26 14" stroke="#6FBF3B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 18 L12 18 M12 18 L12 12 M12 18 L6 24 M6 24 L12 24 M6 24 L6 18" stroke="#4E9A2E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
