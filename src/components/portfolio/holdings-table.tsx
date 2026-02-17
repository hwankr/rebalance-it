"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { m } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatStockCode, formatStockPrice, formatAvgPrice, formatUsdPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Stock } from "@/lib/rebalance/types";
import { useStockChart } from "@/hooks/use-stock-chart";
import { StockPriceChart } from "./stock-price-chart";

interface HoldingsTableProps {
  stocks: Stock[];
  isLoading: boolean;
  exchangeRate?: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("h-4 skeleton-shimmer rounded", className)} />;
}

function profitColor(value: number) {
  if (value > 0) return "profit-up";
  if (value < 0) return "profit-down";
  return "";
}

function profitBg(value: number) {
  if (value > 0) return "profit-up-bg";
  if (value < 0) return "profit-down-bg";
  return "";
}

function StockChartSheet({
  stock,
  open,
  onOpenChange,
}: {
  stock: Stock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useStockChart(
    open ? stock.stock_code : null,
    "day",
    132
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{stock.stock_name}</SheetTitle>
          <SheetDescription>{formatStockCode(stock.stock_code)}</SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">현재가</span>
              <p className="font-medium tabular-nums">{formatStockPrice(stock)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">수익률</span>
              <p className={cn("font-medium tabular-nums", profitColor(stock.profit_rate))}>
                {formatPercent(stock.profit_rate)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">평가금액</span>
              <div className="font-medium tabular-nums">
                <p>{formatCurrency(stock.eval_amount)}</p>
                {stock.currency === "USD" && stock.native_price != null && (
                  <p className="text-xs text-muted-foreground">{formatUsdPrice(stock.native_price * stock.quantity)}</p>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">손익</span>
              <p className={cn("font-medium tabular-nums", profitColor(stock.profit_loss))}>
                {formatCurrency(stock.profit_loss)}
              </p>
            </div>
          </div>

          <StockPriceChart
            chartData={data?.data ?? []}
            stockName={stock.stock_name}
            isLoading={isLoading}
          />
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">닫기</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HoldingsTable({ stocks, isLoading, exchangeRate }: HoldingsTableProps) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  return (
    <>
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>종목명</TableHead>
              <TableHead>종목코드</TableHead>
              <TableHead className="text-right">보유수량</TableHead>
              <TableHead className="text-right">평균단가</TableHead>
              <TableHead className="text-right">현재가</TableHead>
              <TableHead className="text-right">평가금액</TableHead>
              <TableHead className="text-right">손익</TableHead>
              <TableHead className="text-right">수익률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><SkeletonBar className="w-20" /></TableCell>
                  <TableCell><SkeletonBar className="w-16" /></TableCell>
                  <TableCell><SkeletonBar className="w-12 ml-auto" /></TableCell>
                  <TableCell><SkeletonBar className="w-16 ml-auto" /></TableCell>
                  <TableCell><SkeletonBar className="w-16 ml-auto" /></TableCell>
                  <TableCell><SkeletonBar className="w-20 ml-auto" /></TableCell>
                  <TableCell><SkeletonBar className="w-16 ml-auto" /></TableCell>
                  <TableCell><SkeletonBar className="w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  보유 중인 종목이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((stock) => (
                <TableRow
                  key={stock.stock_code}
                  className="hover:bg-accent/30 transition-colors duration-150"
                >
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedStock(stock)}
                      className="font-medium text-left hover:text-primary hover:underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      {stock.stock_name}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatStockCode(stock.stock_code)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stock.quantity.toLocaleString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAvgPrice(stock)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatStockPrice(stock)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div>{formatCurrency(stock.eval_amount)}</div>
                    {stock.currency === "USD" && stock.native_price != null && (
                      <div className="text-xs text-muted-foreground">{formatUsdPrice(stock.native_price * stock.quantity)}</div>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      profitColor(stock.profit_loss),
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                      profitBg(stock.profit_loss)
                    )}>
                      {stock.profit_loss > 0 && <TrendingUp className="h-3 w-3" />}
                      {stock.profit_loss < 0 && <TrendingDown className="h-3 w-3" />}
                      {formatCurrency(stock.profit_loss)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      profitColor(stock.profit_rate),
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                      profitBg(stock.profit_rate)
                    )}>
                      {stock.profit_rate > 0 && <TrendingUp className="h-3 w-3" />}
                      {stock.profit_rate < 0 && <TrendingDown className="h-3 w-3" />}
                      {formatPercent(stock.profit_rate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card p-4">
              <SkeletonBar className="w-32 mb-2" />
              <SkeletonBar className="w-20 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                <SkeletonBar className="h-10" />
                <SkeletonBar className="h-10" />
                <SkeletonBar className="h-10" />
              </div>
            </div>
          ))
        ) : stocks.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            보유 중인 종목이 없습니다.
          </div>
        ) : (
          stocks.map((stock, i) => (
            <m.div
              key={stock.stock_code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div
                className="rounded-lg bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedStock(stock)}
              >
                {/* Top row: stock name + profit rate badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <button
                    type="button"
                    className="font-semibold text-left hover:text-primary transition-colors"
                  >
                    {stock.stock_name}
                  </button>
                  <Badge
                    className={cn(
                      "shrink-0 tabular-nums",
                      stock.profit_rate > 0 && "bg-green-500/10 text-green-600 hover:bg-green-500/20",
                      stock.profit_rate < 0 && "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    )}
                  >
                    {stock.profit_rate > 0 && <TrendingUp className="h-3 w-3 mr-0.5" />}
                    {stock.profit_rate < 0 && <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {formatPercent(stock.profit_rate)}
                  </Badge>
                </div>

                {/* Stock code below name */}
                <div className="text-xs text-muted-foreground mb-3 tabular-nums">
                  {formatStockCode(stock.stock_code)}
                </div>

                {/* Middle row: 3 key values */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">현재가</div>
                    <div className="font-medium tabular-nums text-sm">
                      {formatStockPrice(stock)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">평가금액</div>
                    <div className="font-medium tabular-nums text-sm">
                      <div>{formatCurrency(stock.eval_amount)}</div>
                      {stock.currency === "USD" && stock.native_price != null && (
                        <div className="text-xs text-muted-foreground font-normal">{formatUsdPrice(stock.native_price * stock.quantity)}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">손익</div>
                    <div className={cn("font-medium tabular-nums text-sm", profitColor(stock.profit_loss))}>
                      {formatCurrency(stock.profit_loss)}
                    </div>
                  </div>
                </div>

                {/* Bottom row: secondary info */}
                <div className="text-xs text-muted-foreground tabular-nums">
                  수량 {stock.quantity.toLocaleString("ko-KR")} · 평균 {formatAvgPrice(stock)}
                </div>
              </div>
            </m.div>
          ))
        )}
      </div>

      {selectedStock && (
        <StockChartSheet
          stock={selectedStock}
          open={!!selectedStock}
          onOpenChange={(open) => {
            if (!open) setSelectedStock(null);
          }}
        />
      )}
    </>
  );
}
