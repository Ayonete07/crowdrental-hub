import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type MediaFile = {
  id?: string;
  url: string;
  name?: string;
  filename?: string;
  file_name?: string;
  content_type?: string;
  mime_type?: string;
};

export function fileDisplayName(f: MediaFile | null): string {
  if (!f) return "";
  return f.name || f.filename || f.file_name || (f.url ? f.url.split("/").pop() || "" : "");
}

async function uploadFile(file: File): Promise<MediaFile> {
  const fd = new FormData();
  fd.append("file", file);
  const r: any = await api("/base/files", { method: "POST", body: fd, isForm: true });
  // Response shape unknown; try common shapes
  const url = r?.url || r?.file_url || r?.data?.url || r?.location;
  if (!url) throw new Error("Upload succeeded but no URL was returned");
  return { url, name: file.name, content_type: file.type, ...r };
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (file: MediaFile) => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  const listQuery = useQuery({
    queryKey: ["media-library"],
    queryFn: async () => normalizeList(await api("/base/files", { query: { page: 1, page_size: 100 } })).items,
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: uploadFile,
    onSuccess: (f) => {
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["media-library"] });
      onSelect(f);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Upload failed"),
  });

  const files = (listQuery.data || []).filter((f: MediaFile) => {
    if (!q) return true;
    return fileDisplayName(f).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select or upload media</DialogTitle>
          <DialogDescription>Upload a new file or pick from the library.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input placeholder="Search library" value={q} onChange={(e) => setQ(e.target.value)} />
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
        <ScrollArea className="h-[420px] rounded-md border">
          {listQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading library…</div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No files yet. Upload one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
              {files.map((f: MediaFile, i: number) => {
                const isImg =
                  (f.content_type || f.mime_type || "").startsWith("image") ||
                  /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.url);
                return (
                  <button
                    key={f.id || i}
                    onClick={() => {
                      onSelect(f);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-md border bg-muted text-left",
                      "hover:ring-2 hover:ring-primary transition"
                    )}
                  >
                    {isImg ? (
                      <img src={f.url} alt={fileDisplayName(f)} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground p-2 text-center break-all">
                        {fileDisplayName(f)}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 truncate">
                      {fileDisplayName(f)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
