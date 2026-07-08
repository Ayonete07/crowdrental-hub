import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/nigerian-states";

type Search = { page?: number; kyc_status?: string; q?: string };

export const Route = createFileRoute("/_admin/requesters")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    kyc_status: (s.kyc_status as string) || "",
    q: (s.q as string) || "",
  }),
  component: RequestersPage,
});

function RequestersPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const pageSize = 20;
  const [detail, setDetail] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ["requesters", search],
    queryFn: async () => normalizeList(await api("/admin/requesters", { query: { page: search.page || 1, page_size: pageSize, kyc_status: search.kyc_status } })),
  });

  const items = (q.data?.items || []).filter((r: any) =>
    !search.q ||
    [r.name, r.full_name, r.email, r.phone, r.phone_number].some((v: any) => v && v.toLowerCase().includes(search.q!.toLowerCase()))
  );

  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const detailQ = useQuery({
    queryKey: ["requester", detail?.id],
    queryFn: () => api(`/admin/requesters/${detail.id}`),
    enabled: !!detail?.id,
  });

  return (
    <div>
      <PageHeader title="Requesters" description="People who submitted inspection, wishlist or service requests." />
      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Search by name, email, phone" value={search.q} onChange={(e) => setSearch({ q: e.target.value })} />
          <Select value={search.kyc_status || "__all"} onValueChange={(v) => setSearch({ kyc_status: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="KYC status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All KYC statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
              )) : q.isError ? (
                <TableRow><TableCell colSpan={5}><ErrorState error={q.error} onRetry={() => q.refetch()} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5}><EmptyState title="No requesters" /></TableCell></TableRow>
              ) : items.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <TableCell className="font-medium">{r.full_name || r.name || "—"}</TableCell>
                  <TableCell>{r.email || "—"}</TableCell>
                  <TableCell>{r.phone || r.phone_number || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.kyc_status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination page={search.page || 1} pageSize={pageSize} total={q.data?.total || 0} onChange={(p) => setSearch({ page: p })} />
      </Card>

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.full_name || detail?.name || "Requester"}</SheetTitle>
            <SheetDescription>{detail?.email}</SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 space-y-3 text-sm">
            {detailQ.isLoading ? <Skeleton className="h-32 w-full" /> : (
              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(detailQ.data || detail, null, 2)}</pre>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
