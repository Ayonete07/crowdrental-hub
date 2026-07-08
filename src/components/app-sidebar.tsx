import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Images,
  Users,
  ShieldCheck,
  CalendarCheck,
  Heart,
  Wrench,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const overview = [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }];

const listings = [
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Categories", url: "/categories", icon: FolderTree },
  { title: "Media library", url: "/media-library", icon: Images },
];

const people = [
  { title: "Requesters", url: "/requesters", icon: Users },
  { title: "KYC", url: "/kyc", icon: ShieldCheck },
];

const requests = [
  { title: "Inspections", url: "/inspection-requests", icon: CalendarCheck },
  { title: "Wishlists", url: "/wishlist-requests", icon: Heart },
  { title: "Service requests", url: "/service-requests", icon: Wrench },
];

const system = [{ title: "Notifications", url: "/notifications", icon: Bell }];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const groups = [
    { label: "Overview", items: overview },
    { label: "Listings", items: listings },
    { label: "People", items: people },
    { label: "Requests", items: requests },
    { label: "System", items: system },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            CR
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">CrowdRental</span>
            <span className="text-[11px] text-sidebar-foreground/60">Operations console</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
