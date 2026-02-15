"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearGuestStorage } from "@/contexts/guest-mode-context";
import { mergeGuestData } from "@/lib/storage/merge";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      // Clear guest mode and cached guest data on successful login
      if (event === "SIGNED_IN" && localStorage.getItem("guest-mode") === "true") {
        mergeGuestData(supabase).then(() => {
          clearGuestStorage();
          queryClient.removeQueries();
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { user, loading };
}
