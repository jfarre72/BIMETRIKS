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
