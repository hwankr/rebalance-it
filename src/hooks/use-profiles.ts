"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { RebalanceProfile } from "@/lib/rebalance/profile-types";

export function useProfiles() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ["profiles", user?.id];

  const { data: profiles = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<RebalanceProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (row: Record<string, unknown>): RebalanceProfile => ({
          id: row.id as string,
          name: row.name as string,
          strategy: row.strategy as RebalanceProfile["strategy"],
          threshold_pct: Number(row.threshold_pct),
          calendar_interval:
            (row.calendar_interval as RebalanceProfile["calendar_interval"]) ??
            undefined,
          targets:
            (row.targets as unknown as RebalanceProfile["targets"]) ?? [],
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        }),
      );
    },
  });

  const getProfile = useCallback(
    (id: string): RebalanceProfile | undefined => {
      return profiles.find((p) => p.id === id);
    },
    [profiles],
  );

  const addMutation = useMutation({
    mutationFn: async (
      data: Omit<RebalanceProfile, "id" | "created_at" | "updated_at">,
    ) => {
      const now = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user!.id,
          name: data.name,
          strategy: data.strategy,
          threshold_pct: data.threshold_pct,
          calendar_interval: data.calendar_interval ?? null,
          targets: data.targets as unknown as Record<string, unknown>[],
          created_at: now,
          updated_at: now,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<
        Omit<RebalanceProfile, "id" | "created_at" | "updated_at">
      >;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.strategy !== undefined)
        updateData.strategy = updates.strategy;
      if (updates.threshold_pct !== undefined)
        updateData.threshold_pct = updates.threshold_pct;
      if (updates.calendar_interval !== undefined)
        updateData.calendar_interval = updates.calendar_interval;
      if (updates.targets !== undefined)
        updateData.targets =
          updates.targets as unknown as Record<string, unknown>[];

      const { error } = await supabase
        .from("profiles")
        .update(updateData as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addProfile = useCallback(
    (
      data: Omit<RebalanceProfile, "id" | "created_at" | "updated_at">,
    ): RebalanceProfile => {
      const optimistic: RebalanceProfile = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addMutation.mutate(data);
      return optimistic;
    },
    [addMutation],
  );

  const updateProfile = useCallback(
    (
      id: string,
      updates: Partial<
        Omit<RebalanceProfile, "id" | "created_at" | "updated_at">
      >,
    ): void => {
      updateMutation.mutate({ id, updates });
    },
    [updateMutation],
  );

  const deleteProfile = useCallback(
    (id: string): void => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  return {
    profiles,
    isLoading,
    getProfile,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}
