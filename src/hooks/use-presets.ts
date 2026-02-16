"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { validateTargets } from "@/lib/rebalance/calculator";
import type { Preset, PresetTarget } from "@/lib/rebalance/preset-types";

export function usePresets() {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["presets", effectiveUserId];

  const { data: presets = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<Preset[]> => {
      const { data, error } = await client
        .from("presets")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (row: Record<string, unknown>): Preset => ({
          id: row.id as string,
          name: row.name as string,
          targets:
            (row.targets as unknown as PresetTarget[]) ?? [],
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        }),
      );
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({
      name,
      targets,
    }: {
      name: string;
      targets: PresetTarget[];
    }) => {
      const validation = validateTargets(targets);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      const now = new Date().toISOString();
      const { error } = await client
        .from("presets")
        .insert({
          user_id: effectiveUserId,
          name,
          targets: targets as unknown as Record<string, unknown>[],
          created_at: now,
          updated_at: now,
        } as never);
      if (error) throw error;
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
      updates: Partial<Pick<Preset, "name" | "targets">>;
    }) => {
      if (updates.targets) {
        const validation = validateTargets(updates.targets);
        if (!validation.valid) {
          throw new Error(validation.message);
        }
      }
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.targets !== undefined)
        updateData.targets =
          updates.targets as unknown as Record<string, unknown>[];

      const { error } = await client
        .from("presets")
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
      const { error } = await client
        .from("presets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addPreset = useCallback(
    (name: string, targets: PresetTarget[]) => {
      return addMutation.mutateAsync({ name, targets });
    },
    [addMutation],
  );

  const updatePreset = useCallback(
    (id: string, updates: Partial<Pick<Preset, "name" | "targets">>) => {
      return updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation],
  );

  const deletePreset = useCallback(
    (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const getPreset = useCallback(
    (id: string): Preset | undefined => {
      return presets.find((p) => p.id === id);
    },
    [presets],
  );

  return {
    presets,
    isLoading,
    addPreset,
    updatePreset,
    deletePreset,
    getPreset,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
