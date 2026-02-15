"use client";

import { useGuestMode } from "@/contexts/guest-mode-context";
import { createSupabaseStorageClient } from "./supabase-adapter";
import { createGuestClient } from "./guest-client";
import type { StorageClient } from "./types";

export type { StorageClient } from "./types";

/**
 * Single integration point for data storage.
 * Returns StorageClient backed by either Supabase (authenticated) or localStorage (guest).
 */
export function useStorageClient(): StorageClient {
  const { isGuest } = useGuestMode();
  if (isGuest) return createGuestClient();
  return createSupabaseStorageClient();
}
