"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

import { useProfiles } from "@/hooks/use-profiles";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/layout/page-transition";

const strategyBadge = {
  threshold: { label: "임계값", variant: "default" as const },
  calendar: { label: "정기", variant: "success" as const },
  hybrid: { label: "혼합", variant: "gradient" as const },
};

export default function ProfilesPage() {
  const { profiles, deleteProfile } = useProfiles();
  const { isPro } = useSubscription();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const atFreeLimit = !isPro && profiles.length >= PLAN_LIMITS.free.maxProfiles;

  function handleDelete() {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget);
    setDeleteTarget(null);
    toast.success("프로필이 삭제되었습니다.");
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">프로필 관리</h1>
          <span className="text-sm text-muted-foreground">
            {isPro
              ? `${profiles.length}개 프로필`
              : `${profiles.length}/${PLAN_LIMITS.free.maxProfiles} 프로필`}
          </span>
        </div>
        {atFreeLimit ? (
          <Button disabled>
            <Plus className="size-4" />
            새 프로필
          </Button>
        ) : (
          <Button asChild>
            <Link href="/profiles/new">
              <Plus className="size-4" />
              새 프로필
            </Link>
          </Button>
        )}
      </div>

      {atFreeLimit && (
        <UpgradePrompt
          title="프로필 한도에 도달했습니다"
          description="무료 플랜은 최대 3개의 프로필만 사용할 수 있습니다. Pro 플랜으로 업그레이드하면 무제한으로 프로필을 만들 수 있습니다."
        />
      )}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              등록된 프로필이 없습니다.
            </p>
            <Button asChild>
              <Link href="/profiles/new">
                <Plus className="size-4" />
                프로필 생성
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const badge = strategyBadge[profile.strategy];
            const totalPct = profile.targets.reduce(
              (sum, t) => sum + t.target_pct,
              0,
            );

            return (
              <Card key={profile.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{profile.name}</CardTitle>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    {profile.targets.length}개 종목 · 비중 합계{" "}
                    {totalPct.toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground text-xs">
                    생성일:{" "}
                    {format(new Date(profile.created_at), "yyyy.MM.dd", {
                      locale: ko,
                    })}
                  </p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/profiles/${profile.id}`}>
                      <Eye className="size-4" />
                      상세
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(profile.id)}
                  >
                    <Trash2 className="size-4" />
                    삭제
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필 삭제</DialogTitle>
            <DialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
