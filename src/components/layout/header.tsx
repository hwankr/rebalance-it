"use client";

import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { AccountSelector } from "@/components/account/account-selector";
import { ExchangeRateWidget } from "@/components/layout/exchange-rate-widget";

export function Header() {
  const { isGuest } = useGuestMode();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border backdrop-header px-4 md:px-6">
      {/* Mobile: app logo */}
      <span className="text-lg font-bold text-foreground md:hidden">Rebalance-it</span>

      {/* Account selector */}
      <AccountSelector />

      <div className="flex-1" />

      {/* Exchange rate widget */}
      <ExchangeRateWidget />

      {/* Connection status / Guest indicator */}
      {isGuest ? (
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">게스트</span>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          미연결
        </div>
      )}

      {/* Mobile: settings gear icon */}
      <Link href="/settings" className="md:hidden">
        <Button variant="ghost" size="icon-sm">
          <Settings className="size-5" />
        </Button>
      </Link>

      {/* Desktop: logout or signup button */}
      {isGuest ? (
        <Link href="/login" className="hidden md:block">
          <Button variant="gradient" size="sm" className="gap-2">
            회원가입
          </Button>
        </Link>
      ) : (
        <form action={signOut} className="hidden md:block">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </form>
      )}
    </header>
  );
}
