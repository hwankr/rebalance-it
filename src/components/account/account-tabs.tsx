"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountManager } from "./account-manager";
import { PillButton } from "@/components/ui/pill-toggle";

export function AccountTabs({ showAllTab = true, activeSessionIds }: { showAllTab?: boolean; activeSessionIds?: Set<string> } = {}) {
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading } =
    useAccounts();
  const [managerOpen, setManagerOpen] = useState(false);

  if (isLoading || accounts.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
        {/* 전체 계좌 탭 */}
        {showAllTab && (
          <PillButton
            active={selectedAccountId === "all"}
            onClick={() => setSelectedAccountId("all")}
          >
            전체 계좌
          </PillButton>
        )}

        {/* 개별 계좌 탭 */}
        {accounts.map((account) => (
          <PillButton
            key={account.id}
            active={selectedAccountId === account.id}
            onClick={() => setSelectedAccountId(account.id)}
            className="truncate max-w-[140px]"
          >
            {account.name}
            {activeSessionIds?.has(account.id) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </PillButton>
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
