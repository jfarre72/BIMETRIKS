"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Layers,
  Activity,
  Clock,
  BarChart3,
  Settings,
  FolderOpen,
  Receipt,
  ListChecks,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { signOut } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/tareas", label: "Tareas", icon: ListChecks },
  { href: "/backlog", label: "Backlog", icon: ListTodo },
  { href: "/sprints", label: "Sprints", icon: Layers },
  { href: "/tracking", label: "Tracking", icon: Activity },
  { href: "/horas", label: "Horas", icon: Clock },
  { href: "/facturacion", label: "Facturación", icon: Receipt, staffOnly: true },
  { href: "/reporteria", label: "Reportería", icon: BarChart3, staffOnly: true },
  { href: "/documentacion", label: "Documentación", icon: FolderOpen, staffOnly: true },
  { href: "/configuracion", label: "Configuración", icon: Settings, staffOnly: true },
];

export function Sidebar({
  user,
  clientName,
  role = "CLIENT",
}: {
  user: { name: string; username: string };
  clientName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isStaff = role === "ADMIN" || role === "CONSULTANT";
  const nav = NAV.filter((item) => isStaff || !item.staffOnly);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-navy-800 bg-navy-900 px-4 py-3 lg:hidden">
        <Logo variant="light" showTagline={false} />
        <button onClick={() => setOpen(true)} className="text-white/80" aria-label="Abrir menú">
          <Menu size={22} />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-start justify-between px-4 pb-3 pt-5">
          <Logo variant="light" className="min-w-0 flex-1" />
          <button onClick={() => setOpen(false)} className="text-white/70 lg:hidden" aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        {clientName && (
          <div className="mx-3 mb-2 flex items-baseline gap-2 rounded-lg border border-navy-800 bg-white/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Cliente</span>
            <span className="truncate text-sm font-semibold text-white">{clientName}</span>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 px-3 pt-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-brand/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} className={isActive(href) ? "text-sky" : ""} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-navy-800 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-sky">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-white/50">@{user.username}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
