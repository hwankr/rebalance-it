"use client";

import { useState, useMemo } from "react";
import { FolderInput, AlertTriangle, Check } from "lucide-react";
import { m } from "framer-motion";

import { usePresets } from "@/hooks/use-presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Preset, PresetTarget } from "@/lib/rebalance/preset-types";

interface PresetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (targets: PresetTarget[], presetId: string) => void;
  isApplying: boolean;
  /** stock_code set from user's current portfolio */
  portfolioStockCodes: Set<string>;
}

export function PresetSelector({
  open,
  onOpenChange,
  onApply,
  isApplying,
  portfolioStockCodes,
}: PresetSelectorProps) {
  const { presets, isLoading } = usePresets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedId) ?? null,
    [presets, selectedId],
  );

  const matchInfo = useMemo(() => {
    if (!selectedPreset) return null;
    const presetCodes = new Set(selectedPreset.targets.map((t) => t.stock_code));
    const matched = selectedPreset.targets.filter((t) =>
      portfolioStockCodes.has(t.stock_code),
    );
    const unmatchedPreset = selectedPreset.targets.filter(
      (t) => !portfolioStockCodes.has(t.stock_code),
    );
    const resetPortfolio = [...portfolioStockCodes].filter(
      (code) => !presetCodes.has(code),
    );
    return {
      matched,
      unmatchedPreset,
      resetPortfolioCount: resetPortfolio.length,
    };
  }, [selectedPreset, portfolioStockCodes]);

  const handleOpenChange = (value: boolean) => {
    if (!value) setSelectedId(null);
    onOpenChange(value);
  };

  const handleApply = () => {
    if (!selectedPreset || selectedPreset.targets.length === 0) return;
    onApply(selectedPreset.targets, selectedPreset.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프리셋 불러오기</DialogTitle>
          <DialogDescription>
            저장된 프리셋을 선택하여 목표 비중을 불러옵니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <p className="text-muted-foreground">저장된 프리셋이 없습니다.</p>
              <p className="text-sm text-muted-foreground">
                프리셋 관리 페이지에서 먼저 프리셋을 만들어주세요.
              </p>
            </div>
          ) : (
            <>
              {/* Preset list */}
              {presets.map((preset, i) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  index={i}
                  isSelected={selectedId === preset.id}
                  onSelect={() =>
                    setSelectedId(selectedId === preset.id ? null : preset.id)
                  }
                  portfolioStockCodes={portfolioStockCodes}
                />
              ))}

              {/* Match info for selected preset */}
              {selectedPreset && matchInfo && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  <div className="text-sm font-medium">적용 정보</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-green-600" />
                      <span>
                        매칭 종목: {matchInfo.matched.length}개
                        {matchInfo.matched.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            (목표 비중이 적용됩니다)
                          </span>
                        )}
                      </span>
                    </div>
                    {matchInfo.unmatchedPreset.length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        <span>
                          포트폴리오에 없는 종목: {matchInfo.unmatchedPreset.length}개
                          <span className="text-muted-foreground">
                            {" "}
                            (무시됩니다)
                          </span>
                        </span>
                      </div>
                    )}
                    {matchInfo.resetPortfolioCount > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        <span>
                          프리셋에 없는 보유 종목: {matchInfo.resetPortfolioCount}개
                          <span className="text-muted-foreground">
                            {" "}
                            (목표 비중이 0%로 초기화됩니다)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button
            onClick={handleApply}
            disabled={
              !selectedPreset ||
              selectedPreset.targets.length === 0 ||
              isApplying
            }
          >
            {isApplying ? "적용 중..." : "적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PresetCard({
  preset,
  index,
  isSelected,
  onSelect,
  portfolioStockCodes,
}: {
  preset: Preset;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  portfolioStockCodes: Set<string>;
}) {
  const totalPct = preset.targets.reduce((sum, t) => sum + t.target_pct, 0);
  const roundedTotal = Math.round(totalPct * 100) / 100;
  const matchedCount = preset.targets.filter((t) =>
    portfolioStockCodes.has(t.stock_code),
  ).length;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-colors",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "hover:bg-accent/50",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-semibold">{preset.name}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="tabular-nums text-xs">
                {preset.targets.length}개 종목
              </Badge>
              <Badge
                variant={
                  Math.abs(roundedTotal - 100) < 0.01
                    ? "success"
                    : "destructive"
                }
                className="tabular-nums text-xs"
              >
                {roundedTotal.toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="tabular-nums text-xs">
                매칭 {matchedCount}/{preset.targets.length}
              </Badge>
            </div>
          </div>
          {isSelected && (
            <Check className="size-5 text-primary shrink-0 mt-0.5" />
          )}
        </div>

        {/* Show targets when selected */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            {preset.targets.map((target) => {
              const isMatched = portfolioStockCodes.has(target.stock_code);
              return (
                <div
                  key={target.stock_code}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    isMatched ? "bg-accent/30" : "bg-accent/10 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="font-medium">{target.stock_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {target.stock_code}
                      </span>
                    </div>
                    {!isMatched && (
                      <Badge variant="outline" className="text-xs">
                        미보유
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {target.target_pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </button>
    </m.div>
  );
}
