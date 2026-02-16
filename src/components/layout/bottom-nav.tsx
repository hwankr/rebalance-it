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
  const { selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const { activeSession } = useProgressiveRebalance(portfolioId);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-border/50 bg-background/80 backdrop-blur-md md:hidden safe-area-pb">
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
              <tab.icon className={cn("size-5 transition-transform", isActive && "scale-110")} />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            <span className="text-[11px] font-medium">{tab.label}</span>
            {/* CSS-only active indicator - no layoutId needed */}
            <span
              className={cn(
                "absolute bottom-1 h-0.5 rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] transition-all duration-300",
                isActive ? "w-8 opacity-100" : "w-0 opacity-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
