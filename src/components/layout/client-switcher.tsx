"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setActiveProject } from "@/lib/client-actions";
import type { ProjectOption } from "@/lib/project";

/** Filtro de cliente (staff): cambia el proyecto activo de todo el portal. */
export function ClientSwitcher({ projects, activeProjectId }: { projects: ProjectOption[]; activeProjectId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Si un cliente tiene más de un proyecto, se muestra "Cliente · Proyecto".
  const perClient = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.clientName] = (acc[p.clientName] ?? 0) + 1;
    return acc;
  }, {});
  const label = (p: ProjectOption) => (perClient[p.clientName] > 1 ? `${p.clientName} · ${p.name}` : p.clientName);

  function onChange(id: string) {
    startTransition(async () => {
      const res = await setActiveProject(id);
      if (!res.ok) return alert(res.error ?? "No se pudo cambiar de cliente");
      // Las fichas de detalle (/tracking/:id, /sprints/:id) son del cliente
      // anterior: volvemos al listado de la sección.
      const section = pathname.split("/").filter(Boolean)[0];
      const target = section ? `/${section}` : "/";
      if (target !== pathname) router.push(target);
      router.refresh();
    });
  }

  return (
    <label className="mx-3 mb-2 block rounded-lg border border-navy-800 bg-white/5 px-3 py-1.5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        Cliente {isPending && <Loader2 size={10} className="animate-spin" />}
      </span>
      <select
        value={activeProjectId}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className="mt-0.5 w-full cursor-pointer truncate bg-transparent text-sm font-semibold text-white outline-none disabled:opacity-60"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id} className="text-ink">
            {label(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
