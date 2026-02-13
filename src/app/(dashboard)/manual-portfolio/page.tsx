"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Info, Pencil, RotateCcw, Check } from "lucide-react";

import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { useSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { useRefreshPrices } from "@/hooks/use-refresh-prices";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { StockForm } from "@/components/manual-portfolio/stock-form";
import { StockTable } from "@/components/manual-portfolio/stock-table";
import { formatCurrency } from "@/lib/utils/format";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageTransition } from "@/components/layout/page-transition";

const cashSchema = z.object({
  cash: z.coerce.number().min(0, "예수금은 0 이상이어야 합니다."),
});

interface CashFormValues {
  cash: number;
}

export default function ManualPortfolioPage() {
  const {
    portfolio,
    stocks,
    balance,
    isLoading,
    setCash,
    addStock,
    updateStock,
    deleteStock,
    isAdding,
  } = useManualPortfolio();
  const { settings, updateSettings } = useSettings();
  const { isPro } = useSubscription();
  const { refreshPrices, isRefreshing } = useRefreshPrices();
  const {
    rate: exchangeRate,
    apiRate,
    updatedAt,
    isManualRate,
    setManualRate,
    clearManualRate,
  } = useExchangeRate();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editRateValue, setEditRateValue] = useState("");
  const isManualActive = settings.dataSource === "manual";

  const cashForm = useForm<CashFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cashSchema) as any,
    values: { cash: portfolio?.cash ? Number(portfolio.cash) : 0 },
  });

  function handleCashSubmit(values: CashFormValues) {
    setCash(values.cash);
    toast.success("예수금이 설정되었습니다.");
  }

  function handleAddStock(data: Parameters<typeof addStock>[0]) {
    addStock(data);
    toast.success(`${data.stock_name} 종목이 추가되었습니다.`);
  }

  function handleDeleteStock(id: string) {
    const stock = stocks.find((s) => s.id === id);
    deleteStock(id);
    toast.success(`${stock?.stock_name ?? "종목"}이 삭제되었습니다.`);
  }

  function handleActivateManualMode() {
    updateSettings({ dataSource: "manual" });
    toast.success("수동 모드가 활성화되었습니다.");
  }

  function handleRefreshPrices() {
    refreshPrices(undefined, {
      onSuccess: (result) => {
        if (result.failed === 0) {
          toast.success(`${result.updated}개 종목 가격이 업데이트되었습니다.`);
        } else if (result.updated > 0) {
          toast.warning(`${result.updated}개 성공, ${result.failed}개 실패`);
        } else {
          toast.error("가격 업데이트에 실패했습니다.");
        }
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">수동 포트폴리오</h1>
        <div className="space-y-3">
          <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
          <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const totalEval = stocks.reduce(
    (sum, s) => sum + s.current_price * s.quantity,
    0,
  );
  const totalValue = totalEval + Number(portfolio?.cash ?? 0);

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">수동 포트폴리오</h1>
          {isManualActive ? (
            <Badge>수동 모드 활성</Badge>
          ) : (
            <Badge variant="secondary">비활성</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          키움 API 없이 직접 자산을 입력하고 리밸런싱을 테스트합니다.
        </p>
      </div>

      {/* 수동 모드 활성화 안내 */}
      {!isManualActive && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                현재 키움 API 모드입니다. 수동 포트폴리오를 사용하려면 수동 모드를 활성화하세요.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                설정 페이지에서도 변경할 수 있습니다.
              </p>
            </div>
            <Button size="sm" onClick={handleActivateManualMode}>
              수동 모드 활성화
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="glass-card card-hover">
          <CardHeader>
            <CardDescription>총 평가금액</CardDescription>
            <CardTitle className="text-2xl tabular-nums font-mono">
              {formatCurrency(totalValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card card-hover">
          <CardHeader>
            <CardDescription>주식 평가금액</CardDescription>
            <CardTitle className="text-2xl tabular-nums font-mono">
              {formatCurrency(totalEval)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card card-hover">
          <CardHeader>
            <CardDescription>예수금</CardDescription>
            <CardTitle className="text-2xl tabular-nums font-mono">
              {formatCurrency(Number(portfolio?.cash ?? 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card card-hover">
          <CardHeader>
            <CardDescription>보유 종목 수</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stocks.length}종목</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card card-hover">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardDescription>USD/KRW</CardDescription>
              <div className="flex items-center gap-1">
                {isManualRate && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    수동
                  </Badge>
                )}
                {isEditingRate ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                      const parsed = parseFloat(editRateValue);
                      if (!isNaN(parsed) && parsed > 0) {
                        setManualRate(parsed);
                        toast.success("환율이 수동 설정되었습니다.");
                      }
                      setIsEditingRate(false);
                    }}
                  >
                    <Check className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                      setEditRateValue(String(exchangeRate));
                      setIsEditingRate(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                {isManualRate && !isEditingRate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                      clearManualRate();
                      toast.success("자동 환율로 복원되었습니다.");
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {isEditingRate ? (
              <Input
                type="number"
                step="0.01"
                value={editRateValue}
                onChange={(e) => setEditRateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const parsed = parseFloat(editRateValue);
                    if (!isNaN(parsed) && parsed > 0) {
                      setManualRate(parsed);
                      toast.success("환율이 수동 설정되었습니다.");
                    }
                    setIsEditingRate(false);
                  } else if (e.key === "Escape") {
                    setIsEditingRate(false);
                  }
                }}
                className="h-8 text-lg font-mono tabular-nums"
                autoFocus
              />
            ) : (
              <CardTitle className="text-2xl tabular-nums font-mono">
                {exchangeRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
              </CardTitle>
            )}
            <p className="text-[11px] text-muted-foreground">
              {isManualRate
                ? `자동: ${apiRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`
                : updatedAt
                  ? `${formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ko })} 갱신`
                  : "갱신 시간 알 수 없음"}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* 예수금 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>예수금 설정</CardTitle>
          <CardDescription>
            리밸런싱 시 매수에 사용할 수 있는 현금을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...cashForm}>
            <form
              onSubmit={cashForm.handleSubmit(handleCashSubmit)}
              className="flex items-end gap-3"
            >
              <FormField
                control={cashForm.control}
                name="cash"
                render={({ field }) => (
                  <FormItem className="flex-1 max-w-xs">
                    <FormLabel>예수금 (원)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">저장</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 종목 추가 */}
      <Card>
        <CardHeader>
          <CardTitle>종목 추가</CardTitle>
          <CardDescription>
            보유 종목 정보를 직접 입력합니다. 가격은 수동 입력된 값이며
            실시간으로 갱신되지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockForm onSubmit={handleAddStock} isSubmitting={isAdding} />
        </CardContent>
      </Card>

      {/* 보유 종목 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>보유 종목</CardTitle>
          <CardDescription>
            {stocks.length > 0
              ? `${stocks.length}개 종목을 보유 중입니다.`
              : "종목을 추가하면 여기에 표시됩니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockTable
            stocks={stocks}
            onUpdate={updateStock}
            onDelete={handleDeleteStock}
            onRefresh={isPro ? handleRefreshPrices : undefined}
            isRefreshing={isRefreshing}
            exchangeRate={exchangeRate}
          />
        </CardContent>
      </Card>

      {/* 하단 안내 */}
      {isManualActive && stocks.length > 0 && (
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/rebalance">리밸런싱으로 이동</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portfolio">포트폴리오 현황 보기</Link>
          </Button>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
