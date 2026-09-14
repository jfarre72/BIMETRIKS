"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRequirementField } from "@/lib/actions";
import type { ReqStatus } from "@/lib/types";

/** Select inline para cambiar el estado de un requerimiento rápidamente. */
export function StatusSelect({
  requirementId,
  value,
  statuses,
}: {
  requirementId: string;
  value: string | null;
  statuses: ReqStatus[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [isPending, startTransition] = useTransition();
  const color = statuses.find((s) => s.id === current)?.color ?? "#64748B";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(async () => {
      await updateRequirementField(requirementId, "status_id", next);
      router.refresh();
    });
  }

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      style={{ borderColor: `${color}55`, color }}
      className="h-8 max-w-[150px] rounded-lg border bg-white px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
    >
      {statuses.map((s) => (
        <option key={s.id} value={s.id} style={{ color: "#0F172A" }}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
