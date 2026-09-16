"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Combobox con búsqueda + texto libre. Muestra un desplegable de opciones que
 * se filtra a medida que se escribe; permite elegir una existente o escribir
 * una nueva (que el servidor guarda al crear el requerimiento). El valor viaja
 * en un <input name={name}> para enviarse con el formulario.
 */
export function Combobox({
  name,
  options,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return list.slice(0, 50);
  }, [options, value]);

  // ¿Lo escrito coincide exactamente con una opción ya existente?
  const exists = options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showCreate = value.trim().length > 0 && !exists;

  function choose(v: string) {
    setValue(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      if (open && filtered[highlight]) { e.preventDefault(); choose(filtered[highlight]); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-line bg-white px-3 pr-9 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-float"
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
        >
          {filtered.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => choose(o)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-canvas",
                  i === highlight && "bg-canvas"
                )}
              >
                <span className="text-ink">{o}</span>
                {o.toLowerCase() === value.trim().toLowerCase() && <Check size={14} className="text-brand" />}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                onClick={() => choose(value.trim())}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-brand hover:bg-canvas"
              >
                <span>Crear “{value.trim()}”</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
