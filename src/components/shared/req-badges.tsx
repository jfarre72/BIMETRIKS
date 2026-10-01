import { Badge } from "@/components/ui";
import type { Requirement } from "@/lib/types";

export function StatusBadge({ status }: { status?: Requirement["status"] }) {
  if (!status) return <Badge>Sin estado</Badge>;
  return <Badge color={status.color}>{status.name}</Badge>;
}

export function PriorityBadge({ priority }: { priority?: Requirement["priority"] }) {
  if (!priority) return <Badge>—</Badge>;
  return <Badge color={priority.color}>{priority.name}</Badge>;
}

export function TypeBadge({ type }: { type?: Requirement["type"] }) {
  if (!type) return null;
  return <Badge color={type.color}>{type.name}</Badge>;
}

/**
 * Origen del requerimiento según quién lo creó: un CLIENT (el cliente activo)
 * o el staff (BiMetriks). Devuelve color + etiqueta para diferenciarlos.
 */
export function creatorOrigin(creator?: Requirement["creator"], clientName = "Cliente") {
  const isClient = creator?.role === "CLIENT";
  return isClient
    ? { color: "#CA8A04", label: clientName, short: clientName.slice(0, 1).toUpperCase() } // ámbar → cliente
    : { color: "#0B1E3F", label: "BiMetriks", short: "B" }; // navy → staff
}

export function CreatorBadge({ creator, clientName }: { creator?: Requirement["creator"]; clientName?: string }) {
  const o = creatorOrigin(creator, clientName);
  return (
    <Badge color={o.color} className="whitespace-nowrap">
      {o.label}
    </Badge>
  );
}

/** Distintivo para las reuniones (requerimientos de tipo MEETING). */
export function MeetingTag({ kind }: { kind?: string | null }) {
  if (kind !== "MEETING") return null;
  return <Badge color="#0891B2">Reunión</Badge>;
}
