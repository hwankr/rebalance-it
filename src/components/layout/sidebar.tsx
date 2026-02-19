"use client";

import {
  LayoutDashboard,
  RefreshCw,
  History,
  Settings,
  LogOut,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { NavItem, type NavItemProps } from "./nav";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { useActiveSessionAccount } from "@/hooks/use-active-session-account";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { useAccounts } from "@/hooks/use-accounts";
import { useSubscription } from "@/hooks/use-subscription";

const navItems: NavItemProps[] = [
  { href: "/portfolio", label: "내 포트폴리오", icon: LayoutDashboard },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw },
  { href: "/history", label: "리밸런싱 기록", icon: History },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const { accounts, selectedAccountId } = useAccounts();
  const { activeAccountId } = useActiveSessionAccount(accounts);
  const portfolioId = selectedAccountId === "all"
    ? (accounts.length === 1 ? accounts[0].id : activeAccountId)
    : selectedAccountId;
  const { activeSession } = useProgressiveRebalance(portfolioId);
  const { isGuest } = useGuestMode();
  const { isPro, isPlus } = useSubscription();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex items-center justify-center size-8 bg-primary rounded-lg">
          <Wallet className="h-4 w-4 text-primary-foreground" />
        </div>
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
      ) : isPro ? (
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
      ) : isPlus ? (
        <div className="px-4 py-4 border-t space-y-3">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Pro로 업그레이드</span>
              <PlanBadge />
            </div>
            <p className="text-xs text-muted-foreground">
              고급 분석, AI 기능 등 Pro 전용 기능을 이용하세요
            </p>
            <Button variant="default" className="w-full" size="sm" asChild>
              <Link href="/pricing">Pro로 업그레이드</Link>
            </Button>
          </div>
          <form action={signOut}>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" type="submit">
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </form>
        </div>
      ) : (
        <div className="px-4 py-4 border-t space-y-3">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Plus 플랜</span>
              <PlanBadge />
            </div>
            <p className="text-xs text-muted-foreground">
              무제한 포트폴리오, 자동 리밸런싱, 고급 분석 기능을 이용하세요
            </p>
            <Button variant="default" className="w-full" size="sm" asChild>
              <Link href="/pricing">업그레이드</Link>
            </Button>
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
