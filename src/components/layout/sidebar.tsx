"use client";

import {
  LayoutDashboard,
  RefreshCw,
  FolderOpen,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { NavItem, type NavItemProps } from "./nav";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";

const navItems: NavItemProps[] = [
  { href: "/portfolio", label: "포트폴리오 현황", icon: LayoutDashboard },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw },
  { href: "/profiles", label: "프로필 관리", icon: FolderOpen },
  { href: "/history", label: "실행 이력", icon: History },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex h-14 items-center px-6 font-bold text-lg">
        Rebalance-it
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      <div className="px-3 py-4 border-t">
        <form action={signOut}>
          <Button variant="ghost" className="w-full justify-start gap-2" type="submit">
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </aside>
  );
}

export { navItems };
