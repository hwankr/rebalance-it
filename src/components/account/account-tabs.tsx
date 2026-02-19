"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountManager } from "./account-manager";
import { cn } from "@/lib/utils";

export function AccountTabs({ showAllTab = true }: { showAllTab?: boolean } = {}) {
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading } =
    useAccounts();
  const [managerOpen, setManagerOpen] = useState(false);

  if (isLoading || accounts.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {/* 전체 계좌 탭 */}
        {showAllTab && (
          <button
            type="button"
            onClick={() => setSelectedAccountId("all")}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              selectedAccountId === "all"
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            전체 계좌
          </button>
        )}

        {/* 개별 계좌 탭 */}
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => setSelectedAccountId(account.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors truncate max-w-[140px]",
              selectedAccountId === account.id
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {account.name}
          </button>
        ))}

        {/* 계좌 관리 버튼 */}
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="계좌 관리"
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      <AccountManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
