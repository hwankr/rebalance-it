"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isGuest } = useGuestMode();

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.push("/login");
    }
  }, [user, isGuest, loading, router]);

  if (loading) return null;
  if (!user && !isGuest) return null;

  return <>{children}</>;
}
