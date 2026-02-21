"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useAccounts } from "@/hooks/use-accounts";
import { useActiveSessionAccount } from "@/hooks/use-active-session-account";
import { ExchangeRateWidget } from "@/components/layout/exchange-rate-widget";
import { navItems } from "@/components/layout/nav-config";

// ---------------------------------------------------------------------------
// NavLinks — horizontal desktop nav (center slot)
// ---------------------------------------------------------------------------

function NavLinks() {
  const pathname = usePathname();
  const { accounts } = useAccounts();
  const { activeAccountId } = useActiveSessionAccount(accounts);
  const hasActiveSession = !!activeAccountId;

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const isRebalance = item.href === "/rebalance";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              isActive
                ? "text-primary font-semibold"
                : "font-medium text-muted-foreground hover:text-primary",
            ].join(" ")}
          >
            {item.label}
            {isRebalance && hasActiveSession && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// UserSection — right slot (shared desktop + mobile parts)
// ---------------------------------------------------------------------------

function UserSection() {
  const { isGuest } = useGuestMode();
  const { isPro, isPlus } = useSubscription();
  const showUpgrade = !isGuest && !isPro && !isPlus;

  return (
    <div className="flex items-center gap-2">
      {/* Exchange rate widget — desktop only */}
      <div className="hidden md:flex">
        <ExchangeRateWidget />
      </div>

      {/* Upgrade button — desktop only, non-Pro/Plus authenticated users */}
      {showUpgrade && (
        <Link href="/pricing" className="hidden md:block">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Zap className="size-3.5" />
            업그레이드
          </Button>
        </Link>
      )}

      {/* Settings icon — mobile only */}
      <Link href="/settings" className="md:hidden">
        <Button variant="ghost" size="icon-sm" aria-label="설정">
          <Settings className="size-5" />
        </Button>
      </Link>

      {/* Auth actions */}
      {isGuest ? (
        <Link href="/login">
          <Button variant="gradient" size="sm" className="gap-2">
            회원가입
          </Button>
        </Link>
      ) : (
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hidden md:inline-flex"
          >
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopNavbar — main export
// ---------------------------------------------------------------------------

export function TopNavbar() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center gap-4 px-6 md:px-10">
        {/* Logo */}
        <Link href="/portfolio" className="flex items-center gap-2 shrink-0">
          <Image
            src="/icon-192x192.png"
            alt="Rebalance-it"
            width={32}
            height={32}
            className="size-8"
          />
          <span className="text-lg font-bold text-foreground">
            Rebalance-it
          </span>
        </Link>

        {/* Center nav — desktop */}
        <div className="flex-1 flex justify-center">
          <NavLinks />
        </div>

        {/* Right section */}
        <UserSection />
      </div>
    </header>
  );
}
