import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/nigerian-states";

type Search = { page?: number; status?: string };

export const Route = createFileRoute("/_admin/kyc")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    status: (s.status as string) || "",
  }),
  component: KycPage,
});

function KycPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const qc = useQueryClient();
  const pageSize = 20;
  const [detail, setDetail] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState<{ status: string; note: string } | null>(null);

  const q = useQuery({
    queryKey: ["kyc", search],
    queryFn: async () => normalizeList(await api("/admin/kyc-records", { query: { page: search.page || 1, page_size: pageSize, status: search.status } })),
  });

  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const reviewMut = useMutation({
    mutationFn: ({ id, payload }: any) => api(`/admin/kyc-records/${id}/review`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("KYC updated"); qc.invalidateQueries({ queryKey: ["kyc"] }); setReviewForm(null); setDetail(null); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const items = q.data?.items || [];

  return (
    <div>
      <PageHeader title="KYC records" description="Review and approve identity verifications." />
      <Card className="mb-4 p-3">
        <Select value={search.status || "__all"} onValueChange={(v) => setSearch({ status: v === "__all" ? "" : v })}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
              )) : q.isError ? (
                <TableRow><TableCell colSpan={5}><ErrorState error={q.error} onRetry={() => q.refetch()} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5}><EmptyState title="No KYC records" /></TableCell></TableRow>
              ) : items.map((r: any) => {
                const isDone = r.status === "verified" || r.status === "rejected";
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                    <TableCell className="font-medium">{r.requester_name || r.full_name || r.requester_id || "—"}</TableCell>
                    <TableCell>{r.document_type || r.id_type || "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isDone || reviewMut.isPending} onClick={() => { setDetail(r); setReviewForm({ status: "verified", note: "" }); }}>Verify</DropdownMenuItem>
                          <DropdownMenuItem disabled={isDone || reviewMut.isPending} onClick={() => { setDetail(r); setReviewForm({ status: "rejected", note: "" }); }} className="text-destructive focus:text-destructive">Reject</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDetail(r)}>View details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <Pagination page={search.page || 1} pageSize={pageSize} total={q.data?.total || 0} onChange={(p) => setSearch({ page: p })} />
      </Card>

      <Sheet open={!!detail} onOpenChange={(v) => !v && (setDetail(null), setReviewForm(null))}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KYC record</SheetTitle>
            <SheetDescription>{detail?.requester_name || detail?.full_name}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {detail && (
              <>
                <div className="flex items-center gap-2"><StatusBadge status={detail.status} /></div>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre>
                {reviewForm && (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="grid gap-2">
                      <Label>Decision</Label>
                      <Select value={reviewForm.status} onValueChange={(v) => setReviewForm({ ...reviewForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">Verify</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                          <SelectItem value="in_review">In review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2"><Label>Note</Label><Textarea rows={3} value={reviewForm.note} onChange={(e) => setReviewForm({ ...reviewForm, note: e.target.value })} /></div>
                    <div className="flex justify-end">
                      <Button onClick={() => reviewMut.mutate({ id: detail.id, payload: reviewForm })} disabled={reviewMut.isPending}>
                        {reviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save decision
                      </Button>
                    </div>
                  </div>
                )}
                {!reviewForm && detail.status !== "verified" && detail.status !== "rejected" && (
                  <div className="flex gap-2">
                    <Button onClick={() => setReviewForm({ status: "verified", note: "" })}>Verify</Button>
                    <Button variant="outline" onClick={() => setReviewForm({ status: "rejected", note: "" })}>Reject</Button>
                  </div>
                )}
              </>
            )}
          </div>
          <SheetFooter />
        </SheetContent>
      </Sheet>
    </div>
  );
}
