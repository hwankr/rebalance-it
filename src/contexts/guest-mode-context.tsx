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

/**
 * Plain function (not a hook) to clear guest mode localStorage.
 * Safe to call from event callbacks, auth listeners, etc.
 */
export function clearGuestStorage() {
  localStorage.removeItem(GUEST_MODE_KEY);
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(GUEST_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
  notifyListeners();
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
    clearGuestStorage();
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
