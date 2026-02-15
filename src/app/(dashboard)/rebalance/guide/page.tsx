"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { m } from "framer-motion";
import { ArrowLeft, BookmarkPlus, FileDown, AlertTriangle } from "lucide-react";

import { useHistory } from "@/hooks/use-history";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/layout/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GuideOrder {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  estimated_price: number;
  estimated_amount: number;
}

interface SimulationData {
  orders: GuideOrder[];
  total_buy_amount: number;
  total_sell_amount: number;
  net_cash_change: number;
}

const STORAGE_KEY = "rebalance-it-simulation";

export default function GuidePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { addExecution } = useHistory();
  const [data, setData] = useState<SimulationData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw) as SimulationData);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const sellOrders = data?.orders.filter((o) => o.side === "sell") ?? [];
  const buyOrders = data?.orders.filter((o) => o.side === "buy") ?? [];

  function handleSaveToHistory() {
    if (!data) return;

    addExecution({
      profile_id: "",
      profile_name: "시뮬레이션",
      preset_name: "시뮬레이션",
      status: "completed",
      total_orders: data.orders.length,
      success_count: data.orders.length,
      fail_count: 0,
      total_buy_amount: data.total_buy_amount,
      total_sell_amount: data.total_sell_amount,
      net_cash_change: data.net_cash_change,
      orders: data.orders.map((o) => ({
        ...o,
        success: true,
      })),
    });

    setSaved(true);
    toast.success("시뮬레이션 기록이 저장되었습니다.");
  }

  function handleExportPlaceholder() {
    toast.info("내보내기 기능은 준비 중입니다.", {
      description: "Pro 플랜에서 곧 지원될 예정입니다.",
    });
  }

  if (!data) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱 가이드
          </h1>
          <Card className="flex flex-col items-center justify-center gap-4 p-12">
            <p className="text-muted-foreground text-lg">
              시뮬레이션 결과가 없습니다.
            </p>
            <Button asChild>
              <Link href="/rebalance/simulate">시뮬레이션 실행하기</Link>
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
              리밸런싱 가이드
            </h1>
            <p className="text-muted-foreground">
              아래 안내에 따라 증권사 앱에서 직접 매매하세요.
            </p>
          </div>
        </div>

        {/* 면책 조항 */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-950/30">
            <AlertTriangle className="size-5 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">참고용 안내입니다</p>
              <p>
                이 가이드는 시뮬레이션 결과를 기반으로 한 참고 자료입니다.
                실제 주문은 증권사 앱(HTS/MTS)에서 직접 실행해주세요.
                시장 상황에 따라 실제 체결 가격은 달라질 수 있습니다.
              </p>
            </div>
          </div>
        </m.div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>매도 종목</CardDescription>
              <CardTitle className="text-2xl">{sellOrders.length}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>매수 종목</CardDescription>
              <CardTitle className="text-2xl">{buyOrders.length}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>총 매도 금액</CardDescription>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                {formatCurrency(data.total_sell_amount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>총 매수 금액</CardDescription>
              <CardTitle className="text-xl text-green-600 dark:text-green-400">
                {formatCurrency(data.total_buy_amount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 1단계: 매도 */}
        {sellOrders.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
                    1단계
                  </Badge>
                  <CardTitle>매도할 종목</CardTitle>
                </div>
                <CardDescription>
                  현금을 확보하기 위해 아래 종목을 먼저 매도하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>종목명</TableHead>
                        <TableHead className="text-right">수량</TableHead>
                        <TableHead className="text-right">예상 가격</TableHead>
                        <TableHead className="text-right">예상 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellOrders.map((order) => (
                        <TableRow key={order.stock_code}>
                          <TableCell className="font-medium">
                            {order.stock_name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {order.quantity.toLocaleString("ko-KR")}주
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(order.estimated_price)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatCurrency(order.estimated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {sellOrders.map((order, i) => (
                    <m.div
                      key={order.stock_code}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                      <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{order.stock_name}</span>
                          <Badge className="bg-red-500/10 text-red-600">매도</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground tabular-nums">
                          {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                          {formatCurrency(order.estimated_price)} ={" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(order.estimated_amount)}
                          </span>
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}

        {/* 2단계: 매수 */}
        {buyOrders.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                    {sellOrders.length > 0 ? "2단계" : "1단계"}
                  </Badge>
                  <CardTitle>매수할 종목</CardTitle>
                </div>
                <CardDescription>
                  {sellOrders.length > 0
                    ? "매도 완료 후 아래 종목을 매수하세요."
                    : "아래 종목을 매수하세요."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>종목명</TableHead>
                        <TableHead className="text-right">수량</TableHead>
                        <TableHead className="text-right">예상 가격</TableHead>
                        <TableHead className="text-right">예상 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyOrders.map((order) => (
                        <TableRow key={order.stock_code}>
                          <TableCell className="font-medium">
                            {order.stock_name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {order.quantity.toLocaleString("ko-KR")}주
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(order.estimated_price)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatCurrency(order.estimated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {buyOrders.map((order, i) => (
                    <m.div
                      key={order.stock_code}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                      <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{order.stock_name}</span>
                          <Badge className="bg-green-500/10 text-green-600">매수</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground tabular-nums">
                          {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                          {formatCurrency(order.estimated_price)} ={" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(order.estimated_amount)}
                          </span>
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}

        {/* 순 현금 변동 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">순 현금 변동</span>
              <span
                className={`text-xl font-bold ${
                  data.net_cash_change >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {data.net_cash_change >= 0 ? "+" : ""}
                {formatCurrency(data.net_cash_change)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSaveToHistory}
            disabled={saved}
            className="gap-2"
          >
            <BookmarkPlus className="size-4" />
            {saved ? "저장 완료" : "기록 저장"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPlaceholder}
            className="gap-2"
          >
            <FileDown className="size-4" />
            내보내기 (CSV)
          </Button>
          <Button variant="outline" asChild>
            <Link href="/rebalance/simulate">다시 시뮬레이션</Link>
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
