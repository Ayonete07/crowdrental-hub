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
import { Loader2, MoreHorizontal, Plus, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/nigerian-states";

type Search = { page?: number; status?: string; q?: string };

export const Route = createFileRoute("/_admin/wishlist-requests")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    status: (s.status as string) || "",
    q: (s.q as string) || "",
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const qc = useQueryClient();
  const pageSize = 20;
  const [detail, setDetail] = useState<any | null>(null);
  const [matchForm, setMatchForm] = useState<{ property_id: string; note: string } | null>(null);

  const q = useQuery({
    queryKey: ["wishlists", search],
    queryFn: async () => normalizeList(await api("/admin/wishlist-requests", { query: { page: search.page || 1, page_size: pageSize, status: search.status } })),
  });
  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const items = (q.data?.items || []).filter((r: any) =>
    !search.q || [r.requester_name, r.email, r.city, r.state].some((v: any) => v && v.toLowerCase().includes(search.q!.toLowerCase()))
  );

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api(`/admin/wishlist-requests/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["wishlists"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const matchMut = useMutation({
    mutationFn: ({ id, payload }: any) => api(`/admin/wishlist-requests/${id}/matches`, { method: "POST", body: payload }),
    onSuccess: () => { toast.success("Match added"); setMatchForm(null); qc.invalidateQueries({ queryKey: ["wishlists"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div>
      <PageHeader title="Wishlist requests" description="Requester property preferences waiting for matches." />
      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search requester, city" value={search.q} onChange={(e) => setSearch({ q: e.target.value })} />
          </div>
          <Select value={search.status || "__all"} onValueChange={(v) => setSearch({ status: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
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
                <TableHead>Preferred area</TableHead>
                <TableHead>Budget</TableHead>
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
                <TableRow><TableCell colSpan={6}><EmptyState title="No wishlist requests" /></TableCell></TableRow>
              ) : items.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <TableCell className="font-medium">{r.requester_name || r.full_name || "—"}</TableCell>
                  <TableCell>{[r.city, r.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>{r.budget_max ? `≤ ${Number(r.budget_max).toLocaleString()}` : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setDetail(r); setMatchForm({ property_id: "", note: "" }); }}><Plus className="h-4 w-4" /> Add match</DropdownMenuItem>
                        <DropdownMenuItem disabled={r.status === "matched"} onClick={() => statusMut.mutate({ id: r.id, status: "matched" })}>Mark matched</DropdownMenuItem>
                        <DropdownMenuItem disabled={r.status === "closed"} onClick={() => statusMut.mutate({ id: r.id, status: "closed" })}>Close request</DropdownMenuItem>
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

      <Sheet open={!!detail} onOpenChange={(v) => !v && (setDetail(null), setMatchForm(null))}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Wishlist request</SheetTitle>
            <SheetDescription>{detail?.requester_name || detail?.full_name}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {detail && (
              <>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /></div>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre>
                <div className="rounded-md border p-3 space-y-3">
                  <div className="text-sm font-medium">Add a property match</div>
                  <div className="grid gap-2"><Label>Property ID</Label><Input value={matchForm?.property_id || ""} onChange={(e) => setMatchForm({ property_id: e.target.value, note: matchForm?.note || "" })} placeholder="uuid of property" /></div>
                  <div className="grid gap-2"><Label>Note</Label><Textarea rows={2} value={matchForm?.note || ""} onChange={(e) => setMatchForm({ property_id: matchForm?.property_id || "", note: e.target.value })} /></div>
                  <div className="flex justify-end">
                    <Button disabled={!matchForm?.property_id || matchMut.isPending} onClick={() => matchMut.mutate({ id: detail.id, payload: matchForm })}>
                      {matchMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add match
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
