"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import {
  useAccountSelection,
  type AccountSummary,
} from "@/contexts/account-context";

export function useAccounts() {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["accounts", effectiveUserId];

  const { selectedAccountId, setSelectedAccountId } = useAccountSelection();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<AccountSummary[]> => {
      // select("*") to be resilient against missing columns (migration not applied)
      const { data, error } = await client
        .from("manual_portfolios")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("display_order" as string, { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (row: Record<string, unknown>): AccountSummary => ({
          id: row.id as string,
          name: (row.name as string) ?? "내 계좌",
          display_order: Number(row.display_order ?? 0),
          cash: Number(row.cash ?? 0),
          active_preset_id: (row.active_preset_id as string | null) ?? null,
          created_at: row.created_at as string,
        }),
      );
    },
  });

  // Resolve the effective account: validate selected ID against actual accounts
  const resolvedAccountId = useMemo(() => {
    if (accounts.length === 0) return "all" as const;
    // 계좌가 1개면 항상 해당 계좌 선택 (편집 기능 유지)
    if (accounts.length === 1) return accounts[0].id;
    if (selectedAccountId === "all") return "all" as const;
    const found = accounts.find((a) => a.id === selectedAccountId);
    if (found) return found.id;
    // Invalid ID → fallback to first account
    return accounts[0].id;
  }, [selectedAccountId, accounts]);

  const selectedAccount = useMemo(
    () =>
      resolvedAccountId === "all"
        ? null
        : accounts.find((a) => a.id === resolvedAccountId) ?? null,
    [resolvedAccountId, accounts],
  );

  const createAccountMutation = useMutation({
    mutationFn: async (name: string) => {
      const nextOrder =
        accounts.length > 0
          ? Math.max(...accounts.map((a) => a.display_order)) + 1
          : 0;
      const { data, error } = await client
        .from("manual_portfolios")
        .insert({
          user_id: effectiveUserId,
          name,
          cash: 0,
          display_order: nextOrder,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId: string) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedAccountId(newId);
    },
  });

  const renameAccountMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await client
        .from("manual_portfolios")
        .update({ name } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete stocks first (cascade would handle this, but explicit for guest mode)
      await client.from("manual_stocks").delete().eq("portfolio_id", id);
      const { error } = await client
        .from("manual_portfolios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_: unknown, deletedId: string) => {
      queryClient.invalidateQueries({ queryKey });
      // If deleted account was selected, switch to "all" or first remaining
      if (resolvedAccountId === deletedId) {
        const remaining = accounts.filter((a) => a.id !== deletedId);
        setSelectedAccountId(remaining.length > 0 ? remaining[0].id : "all");
      }
    },
  });

  const reorderAccountMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        client
          .from("manual_portfolios")
          .update({ display_order: idx } as never)
          .eq("id", id),
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createAccount = useCallback(
    (name: string) => createAccountMutation.mutateAsync(name),
    [createAccountMutation],
  );

  const renameAccount = useCallback(
    (id: string, name: string) => renameAccountMutation.mutate({ id, name }),
    [renameAccountMutation],
  );

  const deleteAccount = useCallback(
    (id: string) => deleteAccountMutation.mutate(id),
    [deleteAccountMutation],
  );

  const reorderAccounts = useCallback(
    (orderedIds: string[]) => reorderAccountMutation.mutate(orderedIds),
    [reorderAccountMutation],
  );

  return {
    accounts,
    isLoading,
    selectedAccountId: resolvedAccountId,
    setSelectedAccountId,
    selectedAccount,
    createAccount,
    renameAccount,
    deleteAccount,
    reorderAccounts,
    isCreating: createAccountMutation.isPending,
    isDeleting: deleteAccountMutation.isPending,
  };
}
