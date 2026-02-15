"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Info } from "lucide-react";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "guest-banner-dismissed";

export function GuestBanner() {
  const { isGuest } = useGuestMode();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "true";
  });

  if (!isGuest || dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/30">
      <Info className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div className="flex-1 text-sm text-amber-800 dark:text-amber-200">
        <p>
          게스트 모드로 이용 중입니다. 데이터는 브라우저에만 저장되며, 브라우저
          데이터를 삭제하면 사라집니다.
        </p>
        <Button variant="link" size="sm" asChild className="h-auto p-0 mt-1 text-amber-700 dark:text-amber-300">
          <Link href="/login">회원가입하고 영구 저장하기</Link>
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "true");
          setDismissed(true);
        }}
        className="shrink-0 text-amber-600/60 hover:text-amber-600 dark:text-amber-400/60 dark:hover:text-amber-400 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
