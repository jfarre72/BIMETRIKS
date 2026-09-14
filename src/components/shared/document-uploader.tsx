"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2, FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

type Doc = { id: string; path: string; name: string | null; mime: string | null; created_at: string; url: string };

export function DocumentUploader({ projectId, initial }: { projectId: string; initial: Doc[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<Doc[]>(initial);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of list) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
        const path = `docs/${projectId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("attachments").upload(path, file);
        if (up.error) throw up.error;
        const { data, error: insErr } = await supabase
          .from("project_documents")
          .insert({ project_id: projectId, path, name: file.name, mime: file.type, size: file.size, created_by: user?.id ?? null })
          .select("id,path,name,mime,created_at")
          .single();
        if (insErr) throw insErr;
        const url = supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;
        setItems((prev) => [{ ...(data as any), url }, ...prev]);
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo subir");
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: Doc) {
    if (!confirm("¿Eliminar este documento?")) return;
    setBusy(true);
    await supabase.storage.from("attachments").remove([doc.path]);
    await supabase.from("project_documents").delete().eq("id", doc.id);
    setItems((prev) => prev.filter((d) => d.id !== doc.id));
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed px-6 py-10 text-center text-sm transition-colors ${dragOver ? "border-brand bg-brand/5" : "border-line bg-canvas/50 hover:bg-canvas"}`}
      >
        {busy ? <Loader2 size={22} className="animate-spin text-brand" /> : <Upload size={22} className="text-muted" />}
        <span className="text-muted">Arrastrá archivos o <span className="font-medium text-brand">elegí</span> — relevamientos, PDFs, planillas…</span>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Todavía no hay documentos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((d) => {
            const isImg = (d.mime ?? "").startsWith("image/");
            return (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                {isImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas text-muted"><FileText size={18} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                  <p className="text-xs text-muted">{formatDate(d.created_at)}</p>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Abrir"><Download size={16} /></a>
                <button onClick={() => remove(d)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><Trash2 size={16} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
