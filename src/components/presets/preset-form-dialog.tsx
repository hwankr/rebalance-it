"use client";

import { useState, useCallback } from "react";
import { Plus, X, FolderInput } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StockCombobox } from "@/components/stock-combobox";
import type { PresetTarget } from "@/lib/rebalance/preset-types";
import type { ManualStockRow } from "@/hooks/use-manual-portfolio";

interface PresetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, targets: PresetTarget[]) => void;
  isSubmitting?: boolean;
  portfolioStocks?: ManualStockRow[];
  isPortfolioLoading?: boolean;
}

export function PresetFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  portfolioStocks,
  isPortfolioLoading = false,
}: PresetFormDialogProps) {
  const [name, setName] = useState("");
  const [targets, setTargets] = useState<PresetTarget[]>([]);
  const [showStockPicker, setShowStockPicker] = useState(false);

  const totalPct = targets.reduce((sum, t) => sum + t.target_pct, 0);
  const roundedTotal = Math.round(totalPct * 100) / 100;
  const isValid = name.trim().length > 0 && targets.length > 0 && roundedTotal <= 100;

  const handleReset = useCallback(() => {
    setName("");
    setTargets([]);
    setShowStockPicker(false);
  }, []);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) handleReset();
      onOpenChange(value);
    },
    [onOpenChange, handleReset],
  );

  const handleAddStock = useCallback(
    (stock: { stock_code: string; stock_name: string }) => {
      if (targets.some((t) => t.stock_code === stock.stock_code)) {
        toast.error("이미 추가된 종목입니다.");
        return;
      }
      setTargets((prev) => [
        ...prev,
        {
          stock_code: stock.stock_code,
          stock_name: stock.stock_name,
          target_pct: 0,
        },
      ]);
      setShowStockPicker(false);
    },
    [targets],
  );

  const handleRemoveStock = useCallback((stockCode: string) => {
    setTargets((prev) => prev.filter((t) => t.stock_code !== stockCode));
  }, []);

  const handleLoadFromPortfolio = useCallback(() => {
    if (!portfolioStocks || portfolioStocks.length === 0) {
      toast.info("포트폴리오에 종목이 없습니다.");
      return;
    }
    const existingCodes = new Set(targets.map((t) => t.stock_code));
    const newTargets = portfolioStocks
      .filter((s) => !existingCodes.has(s.stock_code))
      .map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        target_pct: s.target_pct,
      }));
    if (newTargets.length === 0) {
      toast.info("모든 종목이 이미 추가되어 있습니다.");
      return;
    }
    setTargets((prev) => [...prev, ...newTargets]);
    toast.success(`${newTargets.length}개 종목을 불러왔습니다.`);
  }, [portfolioStocks, targets]);

  const handlePctChange = useCallback((stockCode: string, value: string) => {
    const num = parseFloat(value);
    if (value === "" || isNaN(num)) {
      setTargets((prev) =>
        prev.map((t) =>
          t.stock_code === stockCode ? { ...t, target_pct: 0 } : t,
        ),
      );
      return;
    }
    setTargets((prev) =>
      prev.map((t) =>
        t.stock_code === stockCode
          ? { ...t, target_pct: Math.max(0, Math.min(100, num)) }
          : t,
      ),
    );
  }, []);

  const handleSubmit = () => {
    if (!isValid) return;
    const validTargets = targets.filter((t) => t.target_pct > 0);
    if (validTargets.length === 0) {
      toast.error("목표 비중이 0%보다 큰 종목이 필요합니다.");
      return;
    }
    onSubmit(name.trim(), validTargets);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 프리셋 만들기</DialogTitle>
          <DialogDescription>
            목표 비중 프리셋을 생성합니다. 종목을 추가하고 비중을 설정하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 프리셋 이름 */}
          <div className="space-y-2">
            <Label htmlFor="preset-name">프리셋 이름</Label>
            <Input
              id="preset-name"
              placeholder="예: 미국 성장주 포트폴리오"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* 종목 목록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>종목 및 목표 비중</Label>
              <Badge
                variant={roundedTotal > 100 ? "destructive" : roundedTotal === 100 ? "success" : "secondary"}
                className="tabular-nums"
              >
                합계: {roundedTotal.toFixed(1)}%
              </Badge>
            </div>

            {targets.length > 0 && (
              <div className="space-y-2">
                {targets.map((target) => (
                  <div
                    key={target.stock_code}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {target.stock_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {target.stock_code}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-20 h-8 text-right tabular-nums"
                        value={target.target_pct || ""}
                        onChange={(e) =>
                          handlePctChange(target.stock_code, e.target.value)
                        }
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleRemoveStock(target.stock_code)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 종목 추가 */}
            {showStockPicker ? (
              <div className="space-y-2">
                <StockCombobox onSelect={handleAddStock} placeholder="종목 검색..." />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStockPicker(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {portfolioStocks && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleLoadFromPortfolio}
                    disabled={isPortfolioLoading}
                  >
                    <FolderInput className="size-4" />
                    {isPortfolioLoading ? "로딩 중..." : "포트폴리오에서 불러오기"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowStockPicker(true)}
                >
                  <Plus className="size-4" />
                  종목 추가
                </Button>
              </div>
            )}
          </div>

          {roundedTotal > 100 && (
            <p className="text-sm text-destructive">
              목표 비중 합계가 100%를 초과합니다. 조정해주세요.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "저장 중..." : "프리셋 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
