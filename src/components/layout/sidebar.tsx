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
import { useAccounts } from "@/hooks/use-accounts";

const navItems: NavItemProps[] = [
  { href: "/portfolio", label: "내 포트폴리오", icon: LayoutDashboard },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw },
  { href: "/history", label: "리밸런싱 기록", icon: History },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const { selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const { activeSession } = useProgressiveRebalance(portfolioId);
  const { isGuest } = useGuestMode();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2 px-6">
        <span className="text-xl font-bold text-foreground">Rebalance-it</span>
      </div>
      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-4 py-4">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              showBadge={item.href === "/rebalance" && !!activeSession}
            />
          ))}
      </nav>

      {/* Bottom section */}
      {isGuest ? (
        <div className="px-4 py-4 border-t space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">게스트 모드</span>
          </div>
          <p className="text-xs text-muted-foreground px-3">데이터가 브라우저에만 저장됩니다</p>
          <Button variant="gradient" className="w-full" asChild>
            <Link href="/login">회원가입하고 저장하기</Link>
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 border-t space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg">
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
