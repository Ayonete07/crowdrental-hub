import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Copy } from "lucide-react";
import { toast } from "sonner";
import { fileDisplayName } from "@/components/media-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_admin/media-library")({
  component: MediaLibraryPage,
});

function MediaLibraryPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<any | null>(null);

  const list = useQuery({
    queryKey: ["media-library"],
    queryFn: async () => normalizeList(await api("/base/files", { query: { page: 1, page_size: 200 } })).items,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api("/base/files", { method: "POST", body: fd, isForm: true });
    },
    onSuccess: () => { toast.success("File uploaded"); qc.invalidateQueries({ queryKey: ["media-library"] }); },
    onError: (e: any) => toast.error(e?.message || "Upload failed"),
  });

  const files = (list.data || []).filter((f: any) => !q || fileDisplayName(f).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Uploaded photos, videos and documents. Reuse anywhere."
        actions={
          <>
            <input ref={inputRef} type="file" hidden accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
            <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            </Button>
          </>
        }
      />

      <Card className="p-3 mb-4"><Input placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} /></Card>

      {list.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />)}</div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : files.length === 0 ? (
        <EmptyState title="No files yet" description="Upload your first file to build your library." action={<Button onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((f: any, i: number) => {
            const isImg = (f.content_type || f.mime_type || "").startsWith("image") || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.url);
            return (
              <button key={f.id || i} onClick={() => setPreview(f)} className="group relative aspect-square overflow-hidden rounded-md border bg-muted text-left hover:ring-2 hover:ring-primary">
                {isImg ? <img src={f.url} alt={fileDisplayName(f)} className="h-full w-full object-cover" /> : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground p-2 text-center break-all">{fileDisplayName(f)}</div>
                )}
                <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white opacity-0 group-hover:opacity-100">{fileDisplayName(f)}</div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{fileDisplayName(preview)}</DialogTitle></DialogHeader>
          {preview && (
            <>
              <div className="rounded-md bg-muted overflow-hidden">
                <img src={preview.url} alt="" className="max-h-[70vh] w-full object-contain" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input value={preview.url} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(preview.url); toast.success("URL copied"); }}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
