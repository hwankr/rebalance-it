/**
 * Thin adapter wrapping SupabaseClient<Database> to the StorageClient interface.
 *
 * The Supabase client's API is a superset of StorageClient, so the cast is safe.
 * All 10 chain patterns used in hooks are present in Supabase's API.
 */

import { createClient } from "@/lib/supabase/client";
import type { StorageClient } from "./types";

export function createSupabaseStorageClient(): StorageClient {
  const supabase = createClient();
  return supabase as unknown as StorageClient;
}
