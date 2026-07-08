import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeList } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { NIGERIAN_STATES, formatCurrency, formatDate, slugify } from "@/lib/nigerian-states";

type Search = { page?: number; q?: string; property_status?: string; category_id?: string; is_featured?: string; city?: string; state?: string };

export const Route = createFileRoute("/_admin/properties")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: s.page ? Number(s.page) : 1,
    q: (s.q as string) || "",
    property_status: (s.property_status as string) || "",
    category_id: (s.category_id as string) || "",
    is_featured: (s.is_featured as string) || "",
    city: (s.city as string) || "",
    state: (s.state as string) || "",
  }),
  component: PropertiesPage,
});

const STATUS_OPTIONS = [
  { v: "", l: "All statuses" },
  { v: "draft", l: "Draft" },
  { v: "published", l: "Published" },
  { v: "archived", l: "Archived" },
];

function PropertiesPage() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 20;

  const categoriesQ = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => normalizeList(await api("/admin/property-categories", { query: { page: 1, page_size: 200 } })).items,
  });

  const propertiesQ = useQuery({
    queryKey: ["properties", search],
    queryFn: async () => {
      const res = await api("/admin/properties", {
        query: {
          page: search.page || 1,
          page_size: pageSize,
          property_status: search.property_status,
          category_id: search.category_id,
          is_featured: search.is_featured || undefined,
          city: search.city,
          state: search.state,
        },
      });
      return normalizeList(res);
    },
  });

  const items = useMemo(() => {
    let list = propertiesQ.data?.items || [];
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.state?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [propertiesQ.data, search.q]);

  const setSearch = (patch: Partial<Search>) => nav({ search: { ...search, ...patch, page: patch.page ?? 1 } as any });

  const publishMut = useMutation({
    mutationFn: (id: string) => api(`/admin/properties/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Property published");
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: any) => toast.error(e?.message || "Publish failed"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => api(`/admin/properties/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Property archived");
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: any) => toast.error(e?.message || "Archive failed"),
  });

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage listings, verification, pricing and availability."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New property
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search title, city, slug"
              value={search.q}
              onChange={(e) => setSearch({ q: e.target.value })}
            />
          </div>
          <Select value={search.property_status || "__all"} onValueChange={(v) => setSearch({ property_status: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.v || "__all"} value={o.v || "__all"}>{o.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.category_id || "__all"} onValueChange={(v) => setSearch({ category_id: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All categories</SelectItem>
              {(categoriesQ.data || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.state || "__all"} onValueChange={(v) => setSearch({ state: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__all">All states</SelectItem>
              {NIGERIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.is_featured || "__all"} onValueChange={(v) => setSearch({ is_featured: v === "__all" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Featured" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All</SelectItem>
              <SelectItem value="true">Featured</SelectItem>
              <SelectItem value="false">Not featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertiesQ.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : propertiesQ.isError ? (
                <TableRow><TableCell colSpan={7}><ErrorState error={propertiesQ.error} onRetry={() => propertiesQ.refetch()} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <EmptyState title="No properties" description="Adjust filters or create your first listing." action={
                    <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New property</Button>
                  }/>
                </TableCell></TableRow>
              ) : (
                items.map((p: any) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => nav({ to: "/properties/$id", params: { id: p.id } })}
                  >
                    <TableCell className="font-medium">
                      <div className="line-clamp-1">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </TableCell>
                    <TableCell>{p.city || "—"}</TableCell>
                    <TableCell>{p.price_amount ? formatCurrency(Number(p.price_amount), p.price_currency) : "—"}</TableCell>
                    <TableCell><StatusBadge status={p.property_status} /></TableCell>
                    <TableCell><StatusBadge status={p.verification_status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(p.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/properties/$id" params={{ id: p.id }}>View & edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={p.property_status === "published" || publishMut.isPending}
                            onClick={() => publishMut.mutate(p.id)}
                          >
                            {p.property_status === "published" ? "Published" : "Publish"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={p.property_status === "archived" || archiveMut.isPending}
                            onClick={() => archiveMut.mutate(p.id)}
                          >
                            {p.property_status === "archived" ? "Archived" : "Archive"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          page={search.page || 1}
          pageSize={pageSize}
          total={propertiesQ.data?.total || 0}
          onChange={(p) => setSearch({ page: p })}
        />
      </Card>

      <CreatePropertySheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categoriesQ.data || []}
        onCreated={(id) => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ["properties"] });
          nav({ to: "/properties/$id", params: { id } });
        }}
      />
    </div>
  );
}

function CreatePropertySheet({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: any[];
  onCreated: (id: string) => void;
}) {
  const [f, setF] = useState<any>({
    category_id: "",
    title: "",
    slug: "",
    description: "",
    address: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    country: "Nigeria",
    latitude: 0,
    longitude: 0,
    price_amount: 0,
    price_currency: "NGN",
    price_period: "yearly",
    price_note: "",
    bedrooms: 0,
    bathrooms: 0,
    toilets: 0,
    parking_spaces: 0,
    map_url: "",
    video_url: "",
    is_featured: false,
  });

  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  const createMut = useMutation({
    mutationFn: (payload: any) => api("/admin/properties", { method: "POST", body: payload }),
    onSuccess: (r: any) => {
      toast.success("Property created");
      const id = r?.id || r?.data?.id;
      if (id) onCreated(id);
      else onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Could not create property"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.category_id) return toast.error("Category is required");
    if (!f.title) return toast.error("Title is required");
    const payload = {
      ...f,
      slug: f.slug || slugify(f.title),
      price_amount: Number(f.price_amount) || 1,
      latitude: Number(f.latitude) || 0,
      longitude: Number(f.longitude) || 0,
      bedrooms: Number(f.bedrooms) || 0,
      bathrooms: Number(f.bathrooms) || 0,
      toilets: Number(f.toilets) || 0,
      parking_spaces: Number(f.parking_spaces) || 0,
    };
    createMut.mutate(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New property</SheetTitle>
          <SheetDescription>Create a new listing. You can add media and price notes after saving.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-4 p-4 pt-2">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={f.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={f.title} onChange={(e) => { set("title", e.target.value); if (!f.slug) set("slug", slugify(e.target.value)); }} />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Address</Label><Input value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Area</Label><Input value={f.area} onChange={(e) => set("area", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Landmark</Label><Input value={f.landmark} onChange={(e) => set("landmark", e.target.value)} /></div>
            <div className="grid gap-2"><Label>City</Label><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>State</Label>
              <Select value={f.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Country</Label><Input value={f.country} disabled /></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2"><Label>Price</Label><Input type="number" min={1} value={f.price_amount} onChange={(e) => set("price_amount", e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={f.price_currency} onValueChange={(v) => set("price_currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Period</Label>
              <Select value={f.price_period} onValueChange={(v) => set("price_period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2"><Label>Price note</Label><Input value={f.price_note} onChange={(e) => set("price_note", e.target.value)} /></div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="grid gap-2"><Label>Bedrooms</Label><Input type="number" min={0} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Bathrooms</Label><Input type="number" min={0} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Toilets</Label><Input type="number" min={0} value={f.toilets} onChange={(e) => set("toilets", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Parking</Label><Input type="number" min={0} value={f.parking_spaces} onChange={(e) => set("parking_spaces", e.target.value)} /></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Latitude</Label><Input type="number" step="any" value={f.latitude} onChange={(e) => set("latitude", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Longitude</Label><Input type="number" step="any" value={f.longitude} onChange={(e) => set("longitude", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Map URL</Label><Input value={f.map_url} onChange={(e) => set("map_url", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Video URL</Label><Input value={f.video_url} onChange={(e) => set("video_url", e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Featured</Label>
              <p className="text-xs text-muted-foreground">Highlight this property in featured surfaces.</p>
            </div>
            <Switch checked={f.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
          </div>
          <SheetFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create property
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
