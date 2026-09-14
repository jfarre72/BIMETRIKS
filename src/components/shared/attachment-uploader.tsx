"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import type { Attachment } from "@/lib/types";

export function AttachmentUploader({
  requirementId,
  initial,
}: {
  requirementId: string;
  initial: Attachment[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<Attachment[]>(initial);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      for (const file of list) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
        const path = `${requirementId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("attachments").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (up.error) throw up.error;
        const { data, error: insErr } = await supabase
          .from("requirement_attachments")
          .insert({
            requirement_id: requirementId,
            path,
            name: file.name,
            mime: file.type,
            size: file.size,
            created_by: user?.id ?? null,
          })
          .select("id,requirement_id,path,name,mime,created_at")
          .single();
        if (insErr) throw insErr;
        const url = supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;
        setItems((prev) => [...prev, { ...(data as any), url }]);
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo subir el archivo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(att: Attachment) {
    if (!confirm("¿Eliminar este adjunto?")) return;
    setBusy(true);
    await supabase.storage.from("attachments").remove([att.path]);
    await supabase.from("requirement_attachments").delete().eq("id", att.id);
    setItems((prev) => prev.filter((a) => a.id !== att.id));
    setBusy(false);
    router.refresh();
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      uploadFiles(files);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Paperclip size={15} className="text-muted" />
        <h3 className="text-sm font-semibold text-ink">Adjuntos</h3>
        <span className="rounded-full bg-line/70 px-2 py-0.5 text-xs tabular text-muted">{items.length}</span>
      </div>

      {/* Zona de drop / paste */}
      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${
          dragOver ? "border-brand bg-brand/5" : "border-line bg-canvas/50 hover:bg-canvas"
        }`}
      >
        {busy ? <Loader2 size={20} className="animate-spin text-brand" /> : <Upload size={20} className="text-muted" />}
        <span className="text-muted">
          Arrastrá archivos, <span className="font-medium text-brand">elegí</span> o pegá con <kbd className="rounded bg-line px-1 text-xs">Ctrl</kbd>+<kbd className="rounded bg-line px-1 text-xs">V</kbd>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.xlsx,.csv,.docx"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((a) => {
            const isImg = (a.mime ?? "").startsWith("image/");
            return (
              <div key={a.id} className="group relative overflow-hidden rounded-xl border border-line bg-white">
                {isImg ? (
                  <a href={a.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.name ?? ""} className="h-28 w-full object-cover" />
                  </a>
                ) : (
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex h-28 flex-col items-center justify-center gap-1 p-2 text-center">
                    <ImageIcon size={22} className="text-muted" />
                    <span className="line-clamp-2 text-xs text-muted">{a.name}</span>
                  </a>
                )}
                <button
                  onClick={() => remove(a)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-muted opacity-0 shadow-sm transition-opacity hover:text-red-600 group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
