"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";

import { usePresets } from "@/hooks/use-presets";
import { useSubscription } from "@/hooks/use-subscription";
import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
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
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { PresetFormDialog } from "@/components/presets/preset-form-dialog";
import type { PresetTarget } from "@/lib/rebalance/preset-types";

interface PresetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (targets: PresetTarget[], presetId: string) => void;
  isApplying: boolean;
}

export function PresetManager({
  open,
  onOpenChange,
  onApplyPreset,
  isApplying,
}: PresetManagerProps) {
  const { presets, isLoading, addPreset, updatePreset, deletePreset, isAdding } = usePresets();
  const { isPro } = useSubscription();
  const { stocks: portfolioStocks, isLoading: isPortfolioLoading } = useManualPortfolio();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{
    id: string;
    name: string;
    targets: PresetTarget[];
  } | null>(null);

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

  const handleEdit = (id: string, name: string, targets: PresetTarget[]) => {
    setEditingPreset({ id, name, targets });
    setEditOpen(true);
  };

  const handleEditSubmit = (name: string, targets: PresetTarget[]) => {
    if (!editingPreset) return;
    updatePreset(editingPreset.id, { name, targets });
    setEditOpen(false);
    setEditingPreset(null);
    toast.success("프리셋이 수정되었습니다.");
  };

  const handleApply = (targets: PresetTarget[], presetId: string) => {
    onApplyPreset(targets, presetId);
    onOpenChange(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>프리셋 관리</DialogTitle>
            <DialogDescription>
              목표 비중 프리셋을 생성, 수정, 삭제하고 적용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Create button */}
            <Button
              disabled={atLimit}
              onClick={() => setCreateOpen(true)}
              className="w-full"
            >
              <Plus className="size-4" />
              새 프리셋
            </Button>

            {atLimit && (
              <UpgradePrompt
                title="프리셋 한도에 도달했습니다"
                description={`무료 플랜은 최대 ${PLAN_LIMITS.free.maxPresets}개의 프리셋만 생성할 수 있습니다. Pro 플랜으로 업그레이드하여 무제한 프리셋을 사용하세요.`}
              />
            )}

            {/* Preset list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">로딩 중...</p>
              </div>
            ) : presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  아직 프리셋이 없습니다. 프리셋을 만들어보세요.
                </p>
              </div>
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
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg mb-1 truncate">
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
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(preset.id, preset.name, preset.targets)}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(preset.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApply(preset.targets, preset.id)}
                            disabled={isApplying}
                            className="flex-1"
                          >
                            적용
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

            {/* Total count */}
            <p className="text-muted-foreground text-sm">
              총 {presets.length}개 프리셋
              {!isPro && ` (최대 ${PLAN_LIMITS.free.maxPresets}개)`}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <PresetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={isAdding}
        portfolioStocks={portfolioStocks}
        isPortfolioLoading={isPortfolioLoading}
        mode="create"
      />

      {/* Edit Dialog */}
      <PresetFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        isSubmitting={isAdding}
        portfolioStocks={portfolioStocks}
        isPortfolioLoading={isPortfolioLoading}
        mode="edit"
        editPresetId={editingPreset?.id}
        initialName={editingPreset?.name}
        initialTargets={editingPreset?.targets}
      />

      {/* Delete confirmation Dialog */}
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
    </>
  );
}
