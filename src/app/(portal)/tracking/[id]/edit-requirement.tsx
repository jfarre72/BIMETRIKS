"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { RequirementForm } from "@/app/(portal)/backlog/requirement-form";
import type { Catalogs, Requirement } from "@/lib/types";

/** Botón para editar el requerimiento desde Tracking. Reutiliza el mismo
 *  formulario del backlog; cada cambio queda registrado en el historial. */
export function EditRequirementButton({
  catalogs,
  requirement,
}: {
  catalogs: Catalogs;
  requirement: Requirement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Pencil size={15} /> Editar
      </Button>
      <RequirementForm
        open={open}
        onClose={() => setOpen(false)}
        catalogs={catalogs}
        requirement={requirement}
      />
    </>
  );
}
