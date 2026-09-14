import { Badge } from "@/components/ui";

const COLORS: Record<string, string> = {
  Planificado: "#8B5CF6",
  Activo: "#1E5EFF",
  Finalizado: "#16A34A",
  Pausado: "#94A3B8",
};

export function SprintStatusBadge({ status }: { status: string }) {
  return <Badge color={COLORS[status] ?? "#64748B"}>{status}</Badge>;
}
