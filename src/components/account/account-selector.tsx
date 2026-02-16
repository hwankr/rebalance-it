"use client";

import { useState } from "react";
import { ChevronsUpDown, Settings2 } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountManager } from "./account-manager";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountSelector() {
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading } =
    useAccounts();
  const [managerOpen, setManagerOpen] = useState(false);

  if (isLoading) return null;

  const selectedLabel =
    accounts.length === 0
      ? "계좌 추가"
      : selectedAccountId === "all"
        ? "전체 계좌"
        : accounts.find((a) => a.id === selectedAccountId)?.name ?? "계좌 선택";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 max-w-[180px] h-8"
          >
            <span className="truncate text-xs font-medium">
              {selectedLabel}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {accounts.length >= 1 && (
            <>
              <DropdownMenuItem
                onClick={() => setSelectedAccountId("all")}
                className={selectedAccountId === "all" ? "bg-accent" : ""}
              >
                전체 계좌
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={selectedAccountId === account.id ? "bg-accent" : ""}
            >
              {account.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setManagerOpen(true)}>
            <Settings2 className="size-4 mr-2" />
            계좌 관리
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
