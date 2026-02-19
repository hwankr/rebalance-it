"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { AccountSummary } from "@/contexts/account-context";

/**
 * 모든 계좌에서 진행중인 리밸런싱 세션이 있는 계좌 ID를 반환합니다.
 * - activeAccountId: 가장 최근 시작된 활성 세션의 계좌 ID (sidebar/bottom-nav 배지용)
 * - activeAccountIds: 활성 세션이 있는 모든 계좌 ID Set (AccountTabs 인디케이터용)
 */
export function useActiveSessionAccount(accounts: AccountSummary[]) {
  const client = useStorageClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();

  const { data, isLoading } = useQuery({
    queryKey: ["active-session-any"],
    enabled: (!!user || isGuest) && accounts.length >= 1,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await client
        .from("executions")
        .select("portfolio_id")
        .eq("status", "in_progress")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: Record<string, unknown>) => row.portfolio_id)
        .filter((id): id is string => typeof id === "string");
    },
  });

  const activeAccountIds = useMemo(
    () => new Set(data ?? []),
    [data],
  );

  const activeAccountId = data?.[0] ?? null;

  return { activeAccountId, activeAccountIds, isLoading };
}
