// Tipos de requerimiento: REQ (requerimiento común) y MEETING (reunión).
// Las reuniones tienen código REU-#### y un flujo de estados reducido.

export type RequirementKind = "REQ" | "MEETING";

/** Estados habilitados para reuniones (por nombre normalizado). */
export const MEETING_STATUS_NAMES = ["nuevo", "priorizado", "estimado", "finalizado"];

const norm = (s: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function isMeeting(r?: { kind?: string | null } | null): boolean {
  return r?.kind === "MEETING";
}

/** Estados válidos para el tipo dado (las reuniones no pasan por relevamiento,
 *  desarrollo, validación, etc.). */
export function statusesForKind<T extends { name: string }>(statuses: T[], kind?: string | null): T[] {
  if (kind !== "MEETING") return statuses;
  return statuses.filter((s) => MEETING_STATUS_NAMES.includes(norm(s.name)));
}
