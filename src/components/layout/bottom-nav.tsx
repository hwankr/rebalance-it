"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useActiveSessionAccount } from "@/hooks/use-active-session-account";
import { useAccounts } from "@/hooks/use-accounts";
import { navItems } from "@/components/layout/nav-config";

const tabs = navItems.filter((item) => item.showInMobile);

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accounts } = useAccounts();
  const { activeAccountId } = useActiveSessionAccount(accounts);

  // Hide BottomNav when the session view is active to avoid z-index conflict
  // with the fixed bottom action bar. User navigates via "나중에 계속" button instead.
  const isRebalancePage = pathname.startsWith("/rebalance");
  if (isRebalancePage && searchParams.get("view") === "session") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-border backdrop-header md:hidden safe-area-pb">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
        const showBadge = tab.href === "/rebalance" && !!activeAccountId;
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
