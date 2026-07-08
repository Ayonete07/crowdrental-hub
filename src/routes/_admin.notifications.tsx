import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, RotateCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/nigerian-states";
import { Label } from "@/components/ui/label";

type Search = { page?: number; status?: string; unread_only?: string };

export const Route = createFileRoute("/_admin/notifications")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    status: (s.status as string) || "",
    unread_only: (s.unread_only as string) || "",
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const qc = useQueryClient();
  const pageSize = 30;

  const q = useQuery({
    queryKey: ["notifications-list", search],
    queryFn: async () => normalizeList(await api("/admin/notifications/", {
      query: {
        page: search.page || 1,
        page_size: pageSize,
        status: search.status,
        unread_only: search.unread_only === "true" ? true : undefined,
      },
    })),
  });

  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const readMut = useMutation({
    mutationFn: (id: string) => api(`/admin/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications-list"] }); qc.invalidateQueries({ queryKey: ["notifications-unread"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const retryMut = useMutation({
    mutationFn: (id: string) => api(`/admin/notifications/${id}/retry`, { method: "POST" }),
    onSuccess: () => { toast.success("Retry queued"); qc.invalidateQueries({ queryKey: ["notifications-list"] }); },
    onError: (e: any) => toast.error(e?.message || "Retry failed"),
  });

  const items = q.data?.items || [];

  return (
    <div>
      <PageHeader title="Notifications" description="System and delivery notifications." />
      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-3 items-end">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={search.status || "__all"} onValueChange={(v) => setSearch({ status: v === "__all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Unread only</Label>
            <Switch checked={search.unread_only === "true"} onCheckedChange={(v) => setSearch({ unread_only: v ? "true" : "" })} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {q.isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : q.isError ? (
          <div className="p-4"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>
        ) : items.length === 0 ? (
          <div className="p-4"><EmptyState title="No notifications" description="You'll see delivery events and alerts here." /></div>
        ) : (
          <ul className="divide-y">
            {items.map((n: any) => {
              const isUnread = !n.read_at;
              return (
                <li key={n.id} className={`p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${isUnread ? "bg-primary/[0.03]" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={n.status} />
                      {n.channel && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{n.channel}</span>}
                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-sm font-medium">{n.title || n.event_type || "Notification"}</div>
                    {n.body && <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread && (
                      <Button size="sm" variant="outline" disabled={readMut.isPending} onClick={() => readMut.mutate(n.id)}>
                        {readMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark read
                      </Button>
                    )}
                    {n.status === "failed" && (
                      <Button size="sm" variant="outline" disabled={retryMut.isPending} onClick={() => retryMut.mutate(n.id)}>
                        {retryMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Retry
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={search.page || 1} pageSize={pageSize} total={q.data?.total || 0} onChange={(p) => setSearch({ page: p })} />
      </Card>
    </div>
  );
}
