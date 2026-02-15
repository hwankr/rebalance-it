"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";

import { usePresets } from "@/hooks/use-presets";
import { useSubscription } from "@/hooks/use-subscription";
import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { PageTransition } from "@/components/layout/page-transition";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { PresetFormDialog } from "@/components/presets/preset-form-dialog";
import type { PresetTarget } from "@/lib/rebalance/preset-types";

export default function PresetsPage() {
  const { presets, isLoading, addPreset, deletePreset, isAdding } = usePresets();
  const { isPro } = useSubscription();
  const { stocks: portfolioStocks, isLoading: isPortfolioLoading } = useManualPortfolio();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const atLimit = !isPro && presets.length >= PLAN_LIMITS.free.maxPresets;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePreset(deleteTarget);
    setDeleteTarget(null);
    toast.success("프리셋이 삭제되었습니다.");
  };

  const handleCreate = (name: string, targets: PresetTarget[]) => {
    addPreset(name, targets);
    setCreateOpen(false);
    toast.success("프리셋이 생성되었습니다.");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
              프리셋 관리
            </h1>
            <p className="text-muted-foreground">목표 비중 프리셋을 관리합니다.</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
              프리셋 관리
            </h1>
            <p className="text-muted-foreground">목표 비중 프리셋을 관리합니다.</p>
          </div>
          <Button disabled={atLimit} onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            새 프리셋
          </Button>
        </div>

        {atLimit && (
          <UpgradePrompt
            title="프리셋 한도에 도달했습니다"
            description={`무료 플랜은 최대 ${PLAN_LIMITS.free.maxPresets}개의 프리셋만 생성할 수 있습니다. Pro 플랜으로 업그레이드하여 무제한 프리셋을 사용하세요.`}
          />
        )}

        {presets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 p-12">
            <p className="text-muted-foreground text-lg">
              아직 프리셋이 없습니다.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              프리셋 만들기
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {presets.map((preset, i) => {
              const totalPct = preset.targets.reduce(
                (sum, t) => sum + t.target_pct,
                0
              );
              const isExpanded = expandedId === preset.id;

              return (
                <m.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div className="glass-card card-hover rounded-xl p-4">
                    {/* Top row: name + metadata */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">
                          {preset.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="tabular-nums">
                            {preset.targets.length}개 종목
                          </Badge>
                          <Badge
                            variant={
                              Math.abs(totalPct - 100) < 0.01
                                ? "success"
                                : "destructive"
                            }
                            className="tabular-nums"
                          >
                            {totalPct.toFixed(1)}%
                          </Badge>
                          <span className="text-xs">
                            {format(new Date(preset.created_at), "yyyy.MM.dd")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(preset.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* Expand/collapse button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(preset.id)}
                      className="w-full justify-between"
                    >
                      <span className="text-sm">목표 비중 보기</span>
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>

                    {/* Expanded targets */}
                    {isExpanded && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t space-y-2"
                      >
                        {preset.targets.map((target) => (
                          <div
                            key={target.stock_code}
                            className="flex items-center justify-between p-2 rounded-lg bg-accent/30"
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {target.stock_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {target.stock_code}
                              </div>
                            </div>
                            <div className="font-semibold tabular-nums">
                              {target.target_pct.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </m.div>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        )}

        <p className="text-muted-foreground text-sm">
          총 {presets.length}개 프리셋
          {!isPro && ` (최대 ${PLAN_LIMITS.free.maxPresets}개)`}
        </p>

        {/* 프리셋 생성 Dialog */}
        <PresetFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          isSubmitting={isAdding}
          portfolioStocks={portfolioStocks}
          isPortfolioLoading={isPortfolioLoading}
        />

        {/* 삭제 확인 Dialog */}
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프리셋 삭제</DialogTitle>
              <DialogDescription>
                이 프리셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete}>
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
