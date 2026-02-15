"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// --- localStorage reactive store ---

const GUEST_MODE_KEY = "guest-mode";
const GUEST_PREFIX = "guest:";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_MODE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

// --- Context ---

interface GuestModeContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const GuestModeContext = createContext<GuestModeContextValue>({
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isGuest = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const enterGuestMode = useCallback(() => {
    localStorage.setItem(GUEST_MODE_KEY, "true");
    notifyListeners();
    router.push("/portfolio");
  }, [router]);

  const exitGuestMode = useCallback(() => {
    // Clear guest mode flag
    localStorage.removeItem(GUEST_MODE_KEY);
    // Clear all guest data keys
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(GUEST_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
    notifyListeners();
  }, []);

  return (
    <GuestModeContext.Provider value={{ isGuest, enterGuestMode, exitGuestMode }}>
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  return useContext(GuestModeContext);
}
