"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  role: string;
  display_name: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProfileData> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role, display_name")
        .eq("id", user!.id)
        .single();

      if (error || !data) {
        return { role: "user", display_name: null };
      }
      return data;
    },
  });

  const role = profile?.role ?? "user";
  const isAdmin = role === "admin";
  const displayName = profile?.display_name ?? null;

  return { role, isAdmin, displayName, isLoading };
}
