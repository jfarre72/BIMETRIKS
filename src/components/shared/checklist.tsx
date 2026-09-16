"use client";

import { useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, ProgressBar } from "@/components/ui";
import type { ChecklistItem } from "@/lib/types";

/**
 * Checklist (subtareas) de un requerimiento. Escribe directo con el cliente de
 * Supabase (RLS de staff) y actualiza de forma optimista: cada acción se ve al
 * instante y se persiste en segundo plano.
 */
export function Checklist({
  requirementId,
  initial,
}: {
  requirementId: string;
  initial: ChecklistItem[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState<ChecklistItem[]>(initial);
  const [text, setText] = useState("");

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const tempId = `temp-${Date.now()}`;
    const sort_index = (items[items.length - 1]?.sort_index ?? 0) + 10;
    const optimistic: ChecklistItem = {
      id: tempId, requirement_id: requirementId, text: value, done: false, sort_index,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, optimistic]);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("requirement_checklist")
      .insert({ requirement_id: requirementId, text: value, sort_index, created_by: user?.id ?? null })
      .select("id,requirement_id,text,done,sort_index,created_at")
      .single();
    if (data) setItems((prev) => prev.map((i) => (i.id === tempId ? (data as any) : i)));
  }

  async function toggle(item: ChecklistItem) {
    const next = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    await supabase
      .from("requirement_checklist")
      .update({ done: next, done_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);
  }

  async function remove(item: ChecklistItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from("requirement_checklist").delete().eq("id", item.id);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={15} className="text-muted" />
        <h3 className="text-sm font-semibold text-ink">Checklist</h3>
        {total > 0 && (
          <span className="rounded-full bg-line/70 px-2 py-0.5 text-xs tabular text-muted">{done}/{total}</span>
        )}
      </div>

      {total > 0 && (
        <div className="mb-3">
          <ProgressBar value={pct} color="#16A34A" />
        </div>
      )}

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-canvas/60">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item)}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
            />
            <span className={`flex-1 text-sm ${item.done ? "text-muted line-through" : "text-ink"}`}>{item.text}</span>
            <button
              onClick={() => remove(item)}
              className="rounded-lg p-1 text-muted opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              aria-label="Eliminar ítem"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Agregar ítem al checklist…" />
        <Button type="submit" variant="secondary"><Plus size={16} /> Agregar</Button>
      </form>
    </div>
  );
}
