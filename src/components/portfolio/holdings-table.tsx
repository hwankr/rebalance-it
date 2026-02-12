"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
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
import { formatCurrency, formatPercent, formatStockCode } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { KiwoomStock } from "@/lib/kiwoom/types";
import { useStockChart } from "@/hooks/use-stock-chart";
import { StockPriceChart } from "./stock-price-chart";

interface HoldingsTableProps {
  stocks: KiwoomStock[];
  isLoading: boolean;
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("h-4 bg-muted animate-pulse rounded", className)} />;
}

function profitColor(value: number) {
  if (value > 0) return "text-red-500";
  if (value < 0) return "text-blue-500";
  return "";
}

function profitBgTint(value: number) {
  if (value > 0) return "bg-red-50 dark:bg-red-950/20";
  if (value < 0) return "bg-blue-50 dark:bg-blue-950/20";
  return "";
}

function StockChartSheet({
  stock,
  open,
  onOpenChange,
}: {
  stock: KiwoomStock;
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
              <p className="font-medium">{formatCurrency(stock.current_price)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">수익률</span>
              <p className={cn("font-medium", profitColor(stock.profit_rate))}>
                {formatPercent(stock.profit_rate)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">평가금액</span>
              <p className="font-medium">{formatCurrency(stock.eval_amount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">손익</span>
              <p className={cn("font-medium", profitColor(stock.profit_loss))}>
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

export function HoldingsTable({ stocks, isLoading }: HoldingsTableProps) {
  const [selectedStock, setSelectedStock] = useState<KiwoomStock | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableRow key={stock.stock_code}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setSelectedStock(stock)}
                    className="font-medium text-left hover:underline cursor-pointer"
                  >
                    {stock.stock_name}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatStockCode(stock.stock_code)}
                </TableCell>
                <TableCell className="text-right">
                  {stock.quantity.toLocaleString("ko-KR")}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(stock.avg_price)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(stock.current_price)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(stock.eval_amount)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    profitColor(stock.profit_loss),
                    profitBgTint(stock.profit_loss),
                    "rounded-sm"
                  )}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {stock.profit_loss > 0 && <TrendingUp className="h-3 w-3" />}
                    {stock.profit_loss < 0 && <TrendingDown className="h-3 w-3" />}
                    {formatCurrency(stock.profit_loss)}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    profitColor(stock.profit_rate),
                    profitBgTint(stock.profit_rate),
                    "rounded-sm"
                  )}
                >
                  <span className="inline-flex items-center gap-0.5">
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
