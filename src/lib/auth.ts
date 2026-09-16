import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";

export const STAFF_ROLES = ["ADMIN", "CONSULTANT"] as const;

export function isStaffRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "CONSULTANT";
}

export function isClientRole(role?: string | null): boolean {
  return role === "CLIENT";
}

/**
 * Guard para páginas exclusivas de staff (ADMIN/CONSULTANT). Si el usuario es
 * CLIENT (o no tiene sesión), lo redirige al inicio. Complementa al RLS de la
 * base: acá evitamos que siquiera vea la pantalla.
 */
export async function requireStaff() {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/");
  }
  return profile;
}
