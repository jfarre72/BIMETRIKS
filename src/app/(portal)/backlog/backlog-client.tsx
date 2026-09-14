"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui";
import { BacklogBoard } from "@/components/backlog/backlog-board";
import type { Catalogs, Requirement, Sprint } from "@/lib/types";
import { RequirementForm } from "./requirement-form";

export function BacklogClient({
  requirements,
  sprints,
  catalogs,
}: {
  requirements: Requirement[];
  sprints: Sprint[];
  catalogs: Catalogs;
}) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Backlog"
        subtitle="Arrastrá para ordenar por prioridad y asignar a sprints"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Nuevo requerimiento
          </Button>
        }
      />

      <BacklogBoard requirements={requirements} sprints={sprints} />

      <RequirementForm open={formOpen} onClose={() => setFormOpen(false)} catalogs={catalogs} requirement={null} />
    </div>
  );
}
