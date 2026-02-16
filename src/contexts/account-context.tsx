"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";

export interface AccountSummary {
  id: string;
  name: string;
  display_order: number;
  cash: number;
  active_preset_id: string | null;
  created_at: string;
}

interface AccountContextValue {
  selectedAccountId: string | "all";
  setSelectedAccountId: (id: string | "all") => void;
}

const AccountContext = createContext<AccountContextValue>({
  selectedAccountId: "all",
  setSelectedAccountId: () => {},
});

function AccountParamSync({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedAccountId = searchParams.get("account") ?? "all";

  const setSelectedAccountId = useCallback(
    (id: string | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "all") {
        params.delete("account");
      } else {
        params.set("account", id);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const value = useMemo(
    () => ({ selectedAccountId, setSelectedAccountId }),
    [selectedAccountId, setSelectedAccountId],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function AccountProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AccountParamSync>{children}</AccountParamSync>
    </Suspense>
  );
}

export function useAccountSelection() {
  return useContext(AccountContext);
}
