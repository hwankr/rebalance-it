"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, RefreshCw, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { useAccounts } from "@/hooks/use-accounts";

const tabs = [
  { href: "/portfolio", label: "포트폴리오", icon: LayoutDashboard },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw },
  { href: "/history", label: "기록", icon: History },
  { href: "/settings", label: "설정", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { accounts, selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all"
    ? (accounts.length === 1 ? accounts[0].id : null)
    : selectedAccountId;
  const { activeSession } = useProgressiveRebalance(portfolioId);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-card shadow-[0_-1px_3px_0_oklch(0_0_0/0.04)] md:hidden safe-area-pb">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
        const showBadge = tab.href === "/rebalance" && !!activeSession;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <tab.icon className="size-5" />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <span className={cn("text-xs", isActive ? "font-semibold" : "font-medium")}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
