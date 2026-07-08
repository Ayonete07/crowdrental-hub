import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreHorizontal, Search as SearchIcon, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/nigerian-states";

type Search = { page?: number; status?: string; request_type?: string; q?: string };

export const Route = createFileRoute("/_admin/service-requests")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    status: (s.status as string) || "",
    request_type: (s.request_type as string) || "",
    q: (s.q as string) || "",
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const qc = useQueryClient();
  const pageSize = 20;
  const [detail, setDetail] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const q = useQuery({
    queryKey: ["services", search],
    queryFn: async () => normalizeList(await api("/admin/service-requests", { query: { page: search.page || 1, page_size: pageSize, status: search.status, request_type: search.request_type } })),
  });
  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const items = (q.data?.items || []).filter((r: any) =>
    !search.q || [r.requester_name, r.email, r.property_title, r.request_type].some((v: any) => v && v.toLowerCase().includes(search.q!.toLowerCase()))
  );

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api(`/admin/service-requests/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const noteMut = useMutation({
    mutationFn: (payload: any) => api(`/admin/notes`, { method: "POST", body: payload }),
    onSuccess: () => { toast.success("Note added"); setNote(""); },
    onError: (e: any) => toast.error(e?.message || "Failed to add note"),
  });

  return (
    <div>
      <PageHeader title="Service requests" description="Maintenance, tenancy support and other service tickets." />
      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search requester, property" value={search.q} onChange={(e) => setSearch({ q: e.target.value })} />
          </div>
          <Select value={search.status || "__all"} onValueChange={(v) => setSearch({ status: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Request type" value={search.request_type} onChange={(e) => setSearch({ request_type: e.target.value })} />
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
              )) : q.isError ? (
                <TableRow><TableCell colSpan={6}><ErrorState error={q.error} onRetry={() => q.refetch()} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={6}><EmptyState title="No service requests" /></TableCell></TableRow>
              ) : items.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <TableCell className="font-medium">{r.requester_name || r.full_name || "—"}</TableCell>
                  <TableCell className="capitalize">{r.request_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{r.property_title || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={r.status === "in_progress"} onClick={() => statusMut.mutate({ id: r.id, status: "in_progress" })}>Start work</DropdownMenuItem>
                        <DropdownMenuItem disabled={r.status === "completed"} onClick={() => statusMut.mutate({ id: r.id, status: "completed" })}>Mark completed</DropdownMenuItem>
                        <DropdownMenuItem disabled={r.status === "cancelled"} onClick={() => statusMut.mutate({ id: r.id, status: "cancelled" })} className="text-destructive focus:text-destructive">Cancel</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination page={search.page || 1} pageSize={pageSize} total={q.data?.total || 0} onChange={(p) => setSearch({ page: p })} />
      </Card>

      <Sheet open={!!detail} onOpenChange={(v) => !v && (setDetail(null), setNote(""))}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Service request</SheetTitle>
            <SheetDescription>{detail?.requester_name || detail?.full_name}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {detail && (
              <>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /></div>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre>
                <div className="rounded-md border p-3 space-y-3">
                  <div className="text-sm font-medium flex items-center gap-2"><StickyNote className="h-4 w-4" /> Add admin note</div>
                  <div className="grid gap-2"><Label>Note</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  <div className="flex justify-end">
                    <Button disabled={!note || noteMut.isPending} onClick={() => noteMut.mutate({ target_type: "service_request", target_id: detail.id, body: note })}>
                      {noteMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save note
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
