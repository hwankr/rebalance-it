"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { useSubscription, setDevPlanOverride } from "@/hooks/use-subscription";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/layout/page-transition";

export default function SettingsPage() {
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isPro, isPlus, isPlusOrAbove, subscription, isDevOverride, realPlan } = useSubscription();
  const { theme, setTheme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  async function handleClearData() {
    setIsResetting(true);
    try {
      const supabase = createClient();

      if (!user && !isGuest) throw new Error("Not authenticated");

      if (isGuest) {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("guest:"));
        keys.forEach((k) => localStorage.removeItem(k));
        queryClient.invalidateQueries();
        toast.success("모든 데이터가 초기화되었습니다.");
        setIsResetting(false);
        setIsResetDialogOpen(false);
        return;
      }

      // Order matters: executions has ON DELETE RESTRICT to manual_portfolios
      await supabase.from("executions").delete().eq("user_id", user!.id);
      await supabase.from("profiles").delete().eq("user_id", user!.id);
      await supabase.from("manual_portfolios").delete().eq("user_id", user!.id);
      await supabase.from("rebalance_settings").delete().eq("user_id", user!.id);
      await supabase.from("settings").delete().eq("user_id", user!.id);

      queryClient.invalidateQueries();
      toast.success("모든 데이터가 초기화되었습니다.");
      setIsResetDialogOpen(false);
    } catch {
      toast.error("데이터 초기화 중 오류가 발생했습니다.");
    } finally {
      setIsResetting(false);
    }
  }

  const themeOptions = [
    { value: "system", label: "시스템", icon: Monitor },
    { value: "light", label: "라이트", icon: Sun },
    { value: "dark", label: "다크", icon: Moon },
  ] as const;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">설정</h1>
        <p className="text-muted-foreground">
          앱 설정을 관리합니다.
        </p>
      </div>

      {/* 테마 설정 */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>테마</CardTitle>
          <CardDescription>
            앱의 외관 테마를 선택합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                variant={theme === option.value ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTheme(option.value)}
              >
                <option.icon className="size-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 구독 관리 */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            구독 관리
            <PlanBadge />
          </CardTitle>
          <CardDescription>
            현재 구독 플랜을 확인하고 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPlusOrAbove ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">상태</dt>
                <dd className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-green-500" />
                  활성 구독
                </dd>
                <dt className="text-muted-foreground">다음 결제일</dt>
                <dd>{subscription?.current_period_end ?? "-"}</dd>
              </dl>
              {!isPro && (
                <UpgradePrompt
                  title="Pro 플랜으로 업그레이드"
                  description="AI 기능 등 Pro 전용 기능을 이용하려면 업그레이드하세요."
                />
              )}
              <Button
                variant="outline"
                onClick={() => toast("준비 중입니다")}
              >
                구독 취소
              </Button>
            </>
          ) : (
            <UpgradePrompt
              title="Plus 플랜으로 업그레이드"
              description="더 많은 기능을 이용하려면 Plus 플랜으로 업그레이드하세요."
            />
          )}
        </CardContent>
      </Card>

      {/* 개발용 구독 토글 */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              개발용 구독 토글
              <Badge variant="outline" className="text-yellow-700 border-yellow-400 dark:text-yellow-300">
                DEV
              </Badge>
            </CardTitle>
            <CardDescription>
              개발 중 Pro 기능을 테스트할 수 있습니다. 실제 구독: {realPlan}
              {isDevOverride && " (오버라이드 활성)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button
              variant={isPro && isDevOverride ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDevPlanOverride("pro");
                toast.success("Pro 모드로 전환되었습니다 (개발용)");
              }}
            >
              Pro
            </Button>
            <Button
              variant={isPlus && isDevOverride ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDevPlanOverride("plus");
                toast.success("Plus 모드로 전환되었습니다 (개발용)");
              }}
            >
              Plus
            </Button>
            <Button
              variant={!isPlusOrAbove && isDevOverride ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDevPlanOverride("free");
                toast.success("Free 모드로 전환되었습니다 (개발용)");
              }}
            >
              Free
            </Button>
            {isDevOverride && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDevPlanOverride(null);
                  toast.success("실제 구독 상태로 복원되었습니다.");
                }}
              >
                초기화
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 위험 영역 */}
      <Card className="border-red-200 dark:border-red-900/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400">위험 영역</CardTitle>
          <CardDescription>
            되돌릴 수 없는 작업입니다. 신중하게 진행해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {isResetting ? "초기화 중..." : "데이터 초기화"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>데이터 초기화</DialogTitle>
                <DialogDescription className="space-y-2">
                  <span className="block">다음 데이터가 모두 삭제됩니다:</span>
                  <span className="block text-sm">
                    • 리밸런싱 실행 기록<br />
                    • 포트폴리오 프로필<br />
                    • 수동 포트폴리오 및 종목<br />
                    • 리밸런싱 설정<br />
                    • 앱 설정
                  </span>
                  <span className="block font-medium text-red-600 dark:text-red-400">
                    이 작업은 되돌릴 수 없습니다.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isResetting}>취소</Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleClearData} disabled={isResetting}>
                  {isResetting ? <Loader2 className="size-4 animate-spin" /> : null}
                  초기화
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* 모바일 로그아웃 */}
      <div className="md:hidden">
        <form action={signOut}>
          <Button
            variant="outline"
            className="w-full gap-2 text-muted-foreground"
            type="submit"
          >
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </div>
    </PageTransition>
  );
}
