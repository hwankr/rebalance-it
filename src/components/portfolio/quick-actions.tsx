"use client";

import { RefreshCw, Plus, History } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onAddStock?: () => void;
}

export function QuickActions({ onAddStock }: QuickActionsProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg text-foreground">빠른 실행</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 리밸런싱 실행 */}
        <Link
          href="/rebalance"
          className="flex items-center gap-4 p-5 bg-card border rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-foreground">리밸런싱 실행</h3>
            <p className="text-xs text-muted-foreground">
              포트폴리오 재조정 시작
            </p>
          </div>
        </Link>

        {/* 종목 추가 */}
        <button
          type="button"
          onClick={onAddStock}
          className="flex items-center gap-4 p-5 bg-card border rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer text-left"
        >
          <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-foreground">종목 추가</h3>
            <p className="text-xs text-muted-foreground">
              새로운 종목 추가하기
            </p>
          </div>
        </button>

        {/* 기록 보기 */}
        <Link
          href="/history"
          className="flex items-center gap-4 p-5 bg-card border rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="size-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <History className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-foreground">기록 보기</h3>
            <p className="text-xs text-muted-foreground">
              리밸런싱 히스토리 확인
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
