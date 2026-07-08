import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { slugify, formatDate } from "@/lib/nigerian-states";

export const Route = createFileRoute("/_admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["categories"],
    queryFn: async () => normalizeList(await api("/admin/property-categories", { query: { page: 1, page_size: 200 } })).items,
  });

  const items = q.data || [];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group your properties for filtering and discovery."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New category</Button>}
      />

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
                ))
              ) : q.isError ? (
                <TableRow><TableCell colSpan={6}><ErrorState error={q.error} onRetry={() => q.refetch()} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={6}><EmptyState title="No categories" description="Create a category to group properties." action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New category</Button>} /></TableCell></TableRow>
              ) : items.map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => { setEditing(c); setOpen(true); }}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell><StatusBadge status={c.is_active ? "verified" : "archived"} /></TableCell>
                  <TableCell>{c.sort_order ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditing(c); setOpen(true); }}>Edit</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <CategorySheet
        open={open}
        onOpenChange={setOpen}
        category={editing}
        onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["categories-all"] }); }}
      />
    </div>
  );
}

function CategorySheet({ open, onOpenChange, category, onSaved }: any) {
  const isEdit = !!category;
  const [f, setF] = useState<any>({ name: "", slug: "", description: "", is_active: true, sort_order: 0 });
  useMemo(() => {
    if (category) setF({ name: category.name || "", slug: category.slug || "", description: category.description || "", is_active: !!category.is_active, sort_order: category.sort_order ?? 0 });
    else setF({ name: "", slug: "", description: "", is_active: true, sort_order: 0 });
  }, [category, open]);

  const mut = useMutation({
    mutationFn: (payload: any) => isEdit
      ? api(`/admin/property-categories/${category.id}`, { method: "PATCH", body: payload })
      : api(`/admin/property-categories`, { method: "POST", body: payload }),
    onSuccess: () => { toast.success(isEdit ? "Category updated" : "Category created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit category" : "New category"}</SheetTitle>
          <SheetDescription>Slug is generated from the name.</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...f, slug: slugify(f.name), sort_order: Number(f.sort_order) || 0 }); }}
          className="grid gap-4 p-4 pt-2"
        >
          <div className="grid gap-2"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: slugify(e.target.value) })} required /></div>
          <div className="grid gap-2"><Label>Slug</Label><Input value={f.slug || slugify(f.name)} disabled /></div>
          <div className="grid gap-2"><Label>Description</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><Label>Active</Label><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /></div>
          <SheetFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
