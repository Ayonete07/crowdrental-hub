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
import { Loader2, MoreHorizontal, Search as SearchIcon, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/nigerian-states";

type Search = { page?: number; status?: string; q?: string };

export const Route = createFileRoute("/_admin/inspection-requests")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    status: (s.status as string) || "",
    q: (s.q as string) || "",
  }),
  component: InspectionsPage,
});

function InspectionsPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const qc = useQueryClient();
  const pageSize = 20;
  const [detail, setDetail] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<{ scheduled_for: string; note: string } | null>(null);

  const q = useQuery({
    queryKey: ["inspections", search],
    queryFn: async () => normalizeList(await api("/admin/inspection-requests", { query: { page: search.page || 1, page_size: pageSize, status: search.status } })),
  });

  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const items = (q.data?.items || []).filter((r: any) =>
    !search.q || [r.property_title, r.requester_name, r.email].some((v: any) => v && v.toLowerCase().includes(search.q!.toLowerCase()))
  );

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api(`/admin/inspection-requests/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["inspections"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const scheduleMut = useMutation({
    mutationFn: ({ id, payload }: any) => api(`/admin/inspection-requests/${id}/schedule`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("Inspection scheduled"); setSchedule(null); qc.invalidateQueries({ queryKey: ["inspections"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div>
      <PageHeader title="Inspection requests" description="Schedule and track property inspections." />
      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search requester, property" value={search.q} onChange={(e) => setSearch({ q: e.target.value })} />
          </div>
          <Select value={search.status || "__all"} onValueChange={(v) => setSearch({ status: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Scheduled for</TableHead>
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
                <TableRow><TableCell colSpan={6}><EmptyState title="No inspection requests" /></TableCell></TableRow>
              ) : items.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <TableCell className="font-medium">{r.requester_name || r.full_name || "—"}</TableCell>
                  <TableCell>{r.property_title || r.property_id || "—"}</TableCell>
                  <TableCell className="text-sm">{r.scheduled_for ? formatDateTime(r.scheduled_for) : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setDetail(r); setSchedule({ scheduled_for: r.scheduled_for || "", note: "" }); }}><CalendarClock className="h-4 w-4" /> Schedule</DropdownMenuItem>
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

      <Sheet open={!!detail} onOpenChange={(v) => !v && (setDetail(null), setSchedule(null))}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Inspection request</SheetTitle>
            <SheetDescription>{detail?.requester_name || detail?.full_name}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {detail && (
              <>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /></div>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre>
                <div className="rounded-md border p-3 space-y-3">
                  <div className="text-sm font-medium">Schedule inspection</div>
                  <div className="grid gap-2"><Label>Date & time</Label><Input type="datetime-local" value={(schedule?.scheduled_for || "").slice(0, 16)} onChange={(e) => setSchedule({ scheduled_for: e.target.value, note: schedule?.note || "" })} /></div>
                  <div className="grid gap-2"><Label>Note</Label><Textarea rows={2} value={schedule?.note || ""} onChange={(e) => setSchedule({ scheduled_for: schedule?.scheduled_for || "", note: e.target.value })} /></div>
                  <div className="flex justify-end">
                    <Button disabled={!schedule?.scheduled_for || scheduleMut.isPending} onClick={() => scheduleMut.mutate({ id: detail.id, payload: { scheduled_for: new Date(schedule!.scheduled_for).toISOString(), note: schedule?.note } })}>
                      {scheduleMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save schedule
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
