import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed rounded-lg p-10 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: any; onRetry?: () => void }) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-6 text-center">
      <h3 className="text-sm font-medium text-destructive">Unable to load</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {error?.message || "Something went wrong."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
      <div className="text-muted-foreground">
        {total === 0 ? "No results" : `Page ${page} of ${pages} · ${total} total`}
      </div>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  archived: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning-foreground",
  in_review: "bg-warning/15 text-warning-foreground",
  needs_review: "bg-warning/15 text-warning-foreground",
  verified: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  scheduled: "bg-primary/15 text-primary",
  sent: "bg-success/15 text-success",
  delivered: "bg-success/15 text-success",
  read: "bg-muted text-muted-foreground",
  unread: "bg-primary/15 text-primary",
  new: "bg-primary/15 text-primary",
  matched: "bg-success/15 text-success",
  open: "bg-primary/15 text-primary",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = STATUS_STYLES[status.toLowerCase()] || "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
