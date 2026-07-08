import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, ErrorState } from "@/components/admin-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  ShieldCheck,
  CalendarCheck,
  Heart,
  Wrench,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

const STATS: {
  key: string;
  label: string;
  href: string;
  icon: any;
}[] = [
  { key: "properties", label: "Properties", href: "/properties", icon: Building2 },
  { key: "requesters", label: "Requesters", href: "/requesters", icon: Users },
  { key: "kyc_pending", label: "KYC pending", href: "/kyc", icon: ShieldCheck },
  { key: "inspection_requests", label: "Inspections", href: "/inspection-requests", icon: CalendarCheck },
  { key: "wishlist_requests", label: "Wishlists", href: "/wishlist-requests", icon: Heart },
  { key: "service_requests", label: "Service requests", href: "/service-requests", icon: Wrench },
  { key: "notifications_unread", label: "Unread notifications", href: "/notifications", icon: Bell },
];

function DashboardPage() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => await api("/admin/dashboard"),
  });

  const stats: Record<string, any> = q.data?.stats || q.data?.counts || q.data || {};

  return (
    <div>
      <PageHeader
        title="Overview"
        description="A snapshot of activity across your rental operations."
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {STATS.map((s) => {
            const value = pickStat(stats, s.key);
            const Icon = s.icon;
            return (
              <Link key={s.key} to={s.href} className="group">
                <Card className="transition hover:border-primary/40 hover:shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {s.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {q.isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-semibold">
                          {value === null || value === undefined ? "—" : value}
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pickStat(stats: any, key: string): any {
  if (stats == null) return null;
  const candidates = [
    key,
    key + "_count",
    key + "_total",
    "total_" + key,
  ];
  for (const k of candidates) if (stats[k] !== undefined) return stats[k];
  return null;
}
