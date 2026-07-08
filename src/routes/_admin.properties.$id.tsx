import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, ErrorState, StatusBadge } from "@/components/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, MoreVertical, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { NIGERIAN_STATES, formatCurrency, formatDate, slugify } from "@/lib/nigerian-states";
import { MediaPicker, fileDisplayName } from "@/components/media-picker";

export const Route = createFileRoute("/_admin/properties/$id")({
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const propQ = useQuery({
    queryKey: ["property", id],
    queryFn: () => api(`/admin/properties/${id}`),
  });
  const categoriesQ = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => (await api("/admin/property-categories", { query: { page: 1, page_size: 200 } })).items ?? [],
  });

  const publishMut = useMutation({
    mutationFn: () => api(`/admin/properties/${id}/publish`, { method: "POST" }),
    onSuccess: () => { toast.success("Published"); qc.invalidateQueries({ queryKey: ["property", id] }); },
    onError: (e: any) => toast.error(e?.message || "Publish failed"),
  });
  const archiveMut = useMutation({
    mutationFn: () => api(`/admin/properties/${id}/archive`, { method: "POST" }),
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["property", id] }); },
    onError: (e: any) => toast.error(e?.message || "Archive failed"),
  });

  if (propQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (propQ.isError) return <ErrorState error={propQ.error} onRetry={() => propQ.refetch()} />;
  const p: any = propQ.data;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/properties" })}>
          <ArrowLeft className="h-4 w-4" /> Properties
        </Button>
      </div>
      <PageHeader
        title={p.title}
        description={`${p.city || "—"} · ${p.state || ""} · ${p.slug || ""}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={p.property_status} />
            <StatusBadge status={p.verification_status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={p.property_status === "published" || publishMut.isPending}
                  onClick={() => publishMut.mutate()}
                >
                  {p.property_status === "published" ? "Published" : "Publish"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={p.property_status === "archived" || archiveMut.isPending}
                  onClick={() => archiveMut.mutate()}
                >
                  {p.property_status === "archived" ? "Archived" : "Archive"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <EditPropertyForm property={p} categories={categoriesQ.data || []} onSaved={() => qc.invalidateQueries({ queryKey: ["property", id] })} />
        </TabsContent>
        <TabsContent value="media">
          <PropertyMedia propertyId={id} />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingCard property={p} onSaved={() => qc.invalidateQueries({ queryKey: ["property", id] })} />
        </TabsContent>
        <TabsContent value="verification">
          <VerificationCard property={p} onSaved={() => qc.invalidateQueries({ queryKey: ["property", id] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditPropertyForm({ property, categories, onSaved }: { property: any; categories: any[]; onSaved: () => void }) {
  const [f, setF] = useState<any>({});
  useEffect(() => {
    setF({
      category_id: property.category_id || "",
      title: property.title || "",
      slug: property.slug || "",
      description: property.description || "",
      address: property.address || "",
      area: property.area || "",
      landmark: property.landmark || "",
      city: property.city || "",
      state: property.state || "",
      country: property.country || "Nigeria",
      latitude: property.latitude || 0,
      longitude: property.longitude || 0,
      price_note: property.price_note || "",
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      toilets: property.toilets || 0,
      parking_spaces: property.parking_spaces || 0,
      map_url: property.map_url || "",
      video_url: property.video_url || "",
      is_featured: !!property.is_featured,
    });
  }, [property]);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: (payload: any) => api(`/admin/properties/${property.id}`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("Property updated"); onSaved(); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  return (
    <Card className="p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            ...f,
            slug: f.slug || slugify(f.title),
            latitude: Number(f.latitude) || 0,
            longitude: Number(f.longitude) || 0,
            bedrooms: Number(f.bedrooms) || 0,
            bathrooms: Number(f.bathrooms) || 0,
            toilets: Number(f.toilets) || 0,
            parking_spaces: Number(f.parking_spaces) || 0,
          });
        }}
        className="grid gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={f.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={f.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Slug</Label>
            <Input value={f.slug || ""} onChange={(e) => set("slug", slugify(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>State</Label>
            <Select value={f.state || ""} onValueChange={(v) => set("state", v)}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent className="max-h-72">{NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2"><Label>Description</Label><Textarea rows={4} value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Address</Label><Input value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Area</Label><Input value={f.area || ""} onChange={(e) => set("area", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Landmark</Label><Input value={f.landmark || ""} onChange={(e) => set("landmark", e.target.value)} /></div>
          <div className="grid gap-2"><Label>City</Label><Input value={f.city || ""} onChange={(e) => set("city", e.target.value)} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="grid gap-2"><Label>Bedrooms</Label><Input type="number" min={0} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Bathrooms</Label><Input type="number" min={0} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Toilets</Label><Input type="number" min={0} value={f.toilets} onChange={(e) => set("toilets", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Parking</Label><Input type="number" min={0} value={f.parking_spaces} onChange={(e) => set("parking_spaces", e.target.value)} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Latitude</Label><Input type="number" step="any" value={f.latitude} onChange={(e) => set("latitude", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Longitude</Label><Input type="number" step="any" value={f.longitude} onChange={(e) => set("longitude", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Map URL</Label><Input value={f.map_url || ""} onChange={(e) => set("map_url", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Video URL</Label><Input value={f.video_url || ""} onChange={(e) => set("video_url", e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div><Label>Featured</Label><p className="text-xs text-muted-foreground">Show in featured surfaces.</p></div>
          <Switch checked={!!f.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PricingCard({ property, onSaved }: { property: any; onSaved: () => void }) {
  const [f, setF] = useState({
    price_amount: property.price_amount || 1,
    price_currency: property.price_currency || "NGN",
    price_period: property.price_period || "yearly",
    note: "",
  });
  const mut = useMutation({
    mutationFn: (payload: any) => api(`/admin/properties/${property.id}/price`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("Pricing updated"); onSaved(); setF((s) => ({ ...s, note: "" })); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });
  return (
    <Card className="p-6 max-w-2xl">
      <form
        className="grid gap-4"
        onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...f, price_amount: Number(f.price_amount) }); }}
      >
        <div className="text-sm text-muted-foreground">
          Current: <strong>{formatCurrency(Number(property.price_amount || 0), property.price_currency)}</strong> · {property.price_period}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Amount</Label><Input type="number" min={1} value={f.price_amount} onChange={(e) => setF({ ...f, price_amount: Number(e.target.value) })} /></div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={f.price_currency} onValueChange={(v) => setF({ ...f, price_currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NGN">NGN</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Period</Label>
            <Select value={f.price_period} onValueChange={(v) => setF({ ...f, price_period: v })}>
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
        <div className="grid gap-2"><Label>Note (optional)</Label><Textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <div className="flex justify-end">
          <Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Update price</Button>
        </div>
      </form>
    </Card>
  );
}

function VerificationCard({ property, onSaved }: { property: any; onSaved: () => void }) {
  const [f, setF] = useState({ verification_status: property.verification_status || "pending", note: "" });
  const mut = useMutation({
    mutationFn: (payload: any) => api(`/admin/properties/${property.id}/verification`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("Verification updated"); onSaved(); setF((s) => ({ ...s, note: "" })); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });
  return (
    <Card className="p-6 max-w-2xl">
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(f); }}>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={f.verification_status} onValueChange={(v) => setF({ ...f, verification_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2"><Label>Note</Label><Textarea rows={4} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Explain the decision (optional)" /></div>
        <div className="flex justify-end">
          <Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Update verification</Button>
        </div>
      </form>
    </Card>
  );
}

function PropertyMedia({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const mediaQ = useQuery({
    queryKey: ["property-media", propertyId],
    queryFn: async () => {
      const r: any = await api(`/admin/properties/${propertyId}/media`);
      return Array.isArray(r) ? r : (r.items || r.data || []);
    },
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [viewer, setViewer] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [form, setForm] = useState<any>(null);

  const createMut = useMutation({
    mutationFn: (payload: any) => api(`/admin/properties/${propertyId}/media`, { method: "POST", body: payload }),
    onSuccess: () => { toast.success("Media added"); setForm(null); qc.invalidateQueries({ queryKey: ["property-media", propertyId] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to add media"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: any) => api(`/admin/property-media/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => { toast.success("Media updated"); qc.invalidateQueries({ queryKey: ["property-media", propertyId] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/admin/property-media/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Media removed"); qc.invalidateQueries({ queryKey: ["property-media", propertyId] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  const media: any[] = mediaQ.data || [];

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{media.length} item{media.length === 1 ? "" : "s"}</div>
        <Button size="sm" onClick={() => setPickerOpen(true)}><Upload className="h-4 w-4" /> Add media</Button>
      </div>
      {mediaQ.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          No media yet. Add photos or video to complete this listing.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {media.map((m, i) => (
            <div key={m.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
              <img src={m.url} alt={m.alt_text || ""} className="h-full w-full object-cover cursor-zoom-in" onClick={() => setViewer({ open: true, index: i })} />
              {m.is_primary && <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white flex items-center gap-1"><Star className="h-3 w-3" /> Primary</div>}
              <div className="absolute right-1 top-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="secondary" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={m.is_primary}
                      onClick={() => updateMut.mutate({ id: m.id, payload: { is_primary: true } })}
                    >Set as primary</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMut.mutate(m.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(f) => {
          setSelected(f);
          const name = fileDisplayName(f).replace(/\.[^.]+$/, "");
          setForm({ url: f.url, alt_text: name, caption: name, is_primary: media.length === 0, sort_order: media.length });
        }}
      />

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add media</DialogTitle></DialogHeader>
          {form && (
            <form
              className="grid gap-3"
              onSubmit={(e) => { e.preventDefault(); createMut.mutate({ ...form, sort_order: Number(form.sort_order) || 0 }); }}
            >
              <div className="aspect-video overflow-hidden rounded-md border bg-muted">
                <img src={form.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="grid gap-2"><Label>Alt text</Label><Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Caption</Label><Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></div>
              <div className="grid gap-2 grid-cols-2 items-end">
                <div className="grid gap-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
                <div className="flex items-center justify-between rounded-md border p-3"><Label>Primary</Label><Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending}>{createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <MediaViewer
        media={media}
        state={viewer}
        onClose={() => setViewer({ open: false, index: 0 })}
        onChange={(i) => setViewer({ open: true, index: i })}
      />
    </Card>
  );
}

function MediaViewer({
  media, state, onClose, onChange,
}: {
  media: any[];
  state: { open: boolean; index: number };
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const cur = media[state.index];
  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle className="truncate">{cur?.caption || cur?.alt_text || "Media"}</DialogTitle></DialogHeader>
        {cur && (
          <div className="relative">
            <img src={cur.url} alt={cur.alt_text || ""} className="max-h-[70vh] w-full object-contain rounded-md bg-muted" />
            {media.length > 1 && (
              <>
                <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => onChange((state.index - 1 + media.length) % media.length)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => onChange((state.index + 1) % media.length)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="mt-2 text-center text-xs text-muted-foreground">{state.index + 1} / {media.length}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
