import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api, normalizeList } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function Topbar() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const r = await api("/admin/notifications/", { query: { unread_only: true, page: 1, page_size: 1 } });
      return normalizeList(r).total;
    },
    refetchInterval: 60_000,
  });
  const unread = unreadQuery.data ?? 0;

  const name = user?.name || user?.full_name || user?.email || "Admin";
  const initials = String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ to: "/properties", search: { q } as any });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-3 sm:px-4">
      <SidebarTrigger />
      <form onSubmit={submitSearch} className="relative hidden md:flex flex-1 max-w-xl">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search properties by city, title..."
          className="pl-8 h-9 bg-muted/40"
        />
      </form>
      <div className="flex-1 md:hidden" />
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => nav({ to: "/notifications" })}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] leading-none"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 pl-1 pr-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials || "AD"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm">{name}</span>
              {user?.email && (
                <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              nav({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
