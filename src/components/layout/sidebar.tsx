"use client";

import {
  LayoutDashboard,
  RefreshCw,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { NavItem, type NavItemProps } from "./nav";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { useGuestMode } from "@/contexts/guest-mode-context";

const navItems: NavItemProps[] = [
  { href: "/portfolio", label: "내 포트폴리오", icon: LayoutDashboard },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw },
  { href: "/history", label: "리밸런싱 기록", icon: History },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const { activeSession } = useProgressiveRebalance();
  const { isGuest } = useGuestMode();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2 px-6">
        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] animate-pulse" />
        <span className="text-xl font-bold text-gradient">Rebalance-it</span>
      </div>
      <Separator />

      {/* Navigation with subtle dot-grid background */}
      <nav className="relative flex-1 space-y-1.5 px-4 py-4">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              showBadge={item.href === "/rebalance" && !!activeSession}
            />
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      {isGuest ? (
        <div className="px-4 py-4 border-t space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">게스트 모드</span>
          </div>
          <p className="text-xs text-muted-foreground px-3">데이터가 브라우저에만 저장됩니다</p>
          <Button variant="gradient" className="w-full" asChild>
            <Link href="/login">회원가입하고 저장하기</Link>
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 border-t space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-accent/30">
            <span className="text-xs text-muted-foreground">플랜</span>
            <PlanBadge />
          </div>
          <form action={signOut}>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" type="submit">
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}

export { navItems };
