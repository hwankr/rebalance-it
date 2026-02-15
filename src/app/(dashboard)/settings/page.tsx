"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wifi, WifiOff, Trash2, CheckCircle2, XCircle } from "lucide-react";

import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { useSubscription, setDevPlanOverride } from "@/hooks/use-subscription";
import { createClient } from "@/lib/supabase/client";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const accountSchema = z.object({
  account: z.string().min(8, "계좌번호는 8자 이상이어야 합니다."),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isPro, subscription, isDevOverride, realPlan } = useSubscription();
  const [checking, setChecking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  const { data: setupCheck, isLoading: isSetupLoading } = useQuery<{
    ready: boolean;
    checks: { name: string; configured: boolean; required: boolean }[];
    environment: string;
  }>({
    queryKey: ["setup-check"],
    queryFn: async () => {
      const res = await fetch("/api/setup/check");
      if (!res.ok) throw new Error("Failed to check setup");
      return res.json();
    },
  });

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    values: { account: settings.account },
  });

  async function handleCheckConnection() {
    setChecking(true);
    try {
      const res = await fetch("/api/kiwoom/token", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        updateSettings({ isConnected: true });
        toast.success("API 연결이 확인되었습니다.");
      } else {
        updateSettings({ isConnected: false });
        toast.error(data.error || "API 연결에 실패했습니다.");
      }
    } catch {
      updateSettings({ isConnected: false });
      toast.error("API 연결에 실패했습니다.");
    } finally {
      setChecking(false);
    }
  }

  function onAccountSubmit(values: AccountFormValues) {
    updateSettings({ account: values.account });
    toast.success("계좌 설정이 저장되었습니다.");
  }

  async function handleClearData() {
    setIsResetting(true);
    try {
      const supabase = createClient();

      if (!user && !isGuest) throw new Error("Not authenticated");

      if (isGuest) {
        // Guest mode: clear localStorage guest data
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("guest:"));
        keys.forEach((k) => localStorage.removeItem(k));
        queryClient.invalidateQueries();
        form.reset({ account: "" });
        toast.success("모든 데이터가 초기화되었습니다.");
        setIsResetting(false);
        return;
      }

      await supabase.from("profiles").delete().eq("user_id", user!.id);
      await supabase.from("executions").delete().eq("user_id", user!.id);
      await supabase.from("manual_portfolios").delete().eq("user_id", user!.id);
      await supabase.from("settings").delete().eq("user_id", user!.id);

      queryClient.invalidateQueries();
      form.reset({ account: "" });
      toast.success("모든 데이터가 초기화되었습니다.");
    } catch {
      toast.error("데이터 초기화 중 오류가 발생했습니다.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">설정</h1>
        <p className="text-muted-foreground">
          앱 설정 및 키움증권 API 연결을 관리합니다.
        </p>
      </div>

      {/* 섹션 1: API 연결 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            키움증권 API 연결
            {settings.isConnected ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Wifi className="size-3" />
                연결됨
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="size-3" />
                미연결
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            키움 REST API 포털에서 발급받은 App Key와 Secret을 서버
            환경변수(.env.local)에 설정해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCheckConnection} disabled={checking}>
            {checking && <Loader2 className="animate-spin" />}
            연결 확인
          </Button>
        </CardContent>
      </Card>

      {/* 섹션 2: 계좌 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>계좌 설정</CardTitle>
          <CardDescription>
            리밸런싱에 사용할 계좌번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onAccountSubmit)}
              className="flex items-end gap-3"
            >
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl>
                      <Input placeholder="00000000-00" {...field} />
                    </FormControl>
                    <FormDescription>
                      키움증권 계좌번호를 입력해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">저장</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 섹션 3: 구독 관리 */}
      <Card>
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
          {isPro ? (
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
              <Button
                variant="outline"
                onClick={() => toast("준비 중입니다")}
              >
                구독 취소
              </Button>
            </>
          ) : (
            <UpgradePrompt
              title="Pro 플랜으로 업그레이드"
              description="더 많은 기능을 이용하려면 Pro 플랜으로 업그레이드하세요."
            />
          )}
        </CardContent>
      </Card>

      {/* 섹션 4: 개발용 구독 토글 */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
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
              variant={!isPro && isDevOverride ? "default" : "outline"}
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

      {/* 섹션 5: 앱 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>앱 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">앱 이름</dt>
            <dd>Rebalance-it</dd>
            <dt className="text-muted-foreground">버전</dt>
            <dd>0.1.0</dd>
            <dt className="text-muted-foreground">기술 스택</dt>
            <dd>Next.js, TypeScript, 키움 REST API (읽기 전용)</dd>
          </dl>

          <div className="pt-2">
            <Dialog>
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
                  <DialogDescription>
                    모든 설정 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">취소</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={handleClearData}>
                      초기화
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 섹션 5: 시스템 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 상태</CardTitle>
          <CardDescription>
            환경변수 설정 상태를 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSetupLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              설정 상태를 확인하고 있습니다...
            </div>
          ) : setupCheck ? (
            <>
              <div className="rounded-lg border p-3">
                {setupCheck.ready ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="size-4" />
                    모든 필수 설정이 완료되었습니다.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                    <XCircle className="size-4" />
                    {setupCheck.checks.filter((c) => c.required && !c.configured).length}개의 필수 설정이 필요합니다.
                  </div>
                )}
              </div>
              <ul className="space-y-2">
                {setupCheck.checks.map((check) => (
                  <li
                    key={check.name}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {check.configured ? (
                        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="size-4 text-red-600 dark:text-red-400" />
                      )}
                      <code className="text-xs">{check.name}</code>
                    </div>
                    {check.required && (
                      <Badge variant="secondary" className="text-xs">
                        필수
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              설정 상태를 불러올 수 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
