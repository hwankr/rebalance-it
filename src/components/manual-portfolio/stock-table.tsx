"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Pencil, Check, X, RefreshCw, Loader2, Plus, Sparkles, Newspaper } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import { formatCurrency, formatPercent, formatUsdPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";
import { useStockChart } from "@/hooks/use-stock-chart";
import { StockLogo } from "@/components/stock-logo";
import { StockPriceChart } from "@/components/portfolio/stock-price-chart";
import { StockFinancialsCard } from "@/components/portfolio/stock-financials-card";
import { StockNewsCard } from "@/components/portfolio/stock-news-card";
import { StockForm } from "@/components/manual-portfolio/stock-form";
import { BulkImportDialog } from "@/components/ai/bulk-import-dialog";
import { ScrollFade } from "@/components/ui/scroll-fade";


interface StockRow {
  id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  price_updated_at: string | null;
  currency: string;
  updated_at: string;
  is_rebalance_tracked?: boolean;
  news_enabled?: boolean;
}

interface StockTableProps {
  stocks: StockRow[];
  onUpdate: (id: string, updates: Partial<ManualStockInput>) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  exchangeRate?: number;
  totalPortfolioValue?: number;
  onAddStock?: (data: ManualStockInput) => void;
  isAdding?: boolean;
  onToggleTracked?: (id: string, tracked: boolean) => void;
  isTogglingTracked?: boolean;
  hasActiveSession?: boolean;
  onToggleNews?: (id: string, enabled: boolean) => void;
  isTogglingNews?: boolean;
}



function StockChartSheet({
  stock,
  open,
  onOpenChange,
  exchangeRate,
}: {
  stock: StockRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchangeRate?: number;
}) {
  const { data, isLoading } = useStockChart(
    open ? stock.stock_code : null,
    "day",
    132
  );

  const isUsd = stock.currency === "USD";
  const evalAmount = stock.current_price * stock.quantity;
  const profitLoss = (stock.current_price - stock.avg_price) * stock.quantity;
  const profitRate = stock.avg_price > 0 ? ((stock.current_price - stock.avg_price) / stock.avg_price) * 100 : 0;

  // KRW-equivalent values for USD stocks
  const evalAmountKrw = isUsd && exchangeRate ? evalAmount * exchangeRate : evalAmount;
  const profitLossKrw = isUsd && exchangeRate ? profitLoss * exchangeRate : profitLoss;

  function profitColor(value: number) {
    if (value > 0) return "profit-up";
    if (value < 0) return "profit-down";
    return "";
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StockLogo stockCode={stock.stock_code} stockName={stock.stock_name} currency={stock.currency} size="lg" />
            {stock.stock_name}
          </SheetTitle>
          <SheetDescription>{stock.stock_code}</SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">현재가</span>
              <p className="font-medium tabular-nums">
                {isUsd ? formatUsdPrice(stock.current_price) : formatCurrency(stock.current_price)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">수익률</span>
              <p className={cn("font-medium tabular-nums", profitColor(profitRate))}>
                {formatPercent(profitRate)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">평가금액</span>
              <div className="font-medium tabular-nums">
                <p>{isUsd && exchangeRate ? formatCurrency(Math.round(evalAmountKrw)) : formatCurrency(evalAmount)}</p>
                {isUsd && exchangeRate && (
                  <p className="text-xs text-muted-foreground">{formatUsdPrice(evalAmount)}</p>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">손익</span>
              <p className={cn("font-medium tabular-nums", profitColor(profitLoss))}>
                {isUsd && exchangeRate
                  ? formatCurrency(Math.round(profitLossKrw))
                  : formatCurrency(profitLoss)}
              </p>
            </div>
          </div>

          <StockPriceChart
            chartData={data?.data ?? []}
            stockName={stock.stock_name}
            isLoading={isLoading}
            fetchedAt={data?.fetchedAt}
            provider={data?.provider}
          />

          <StockFinancialsCard
            stockCode={stock.stock_code}
            stockName={stock.stock_name}
            currency={stock.currency}
          />

          <StockNewsCard
            stockCode={stock.stock_code}
            stockName={stock.stock_name}
            currency={stock.currency}
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

export function StockTable({
  stocks,
  onUpdate,
  onDelete,
  onRefresh,
  isRefreshing,
  exchangeRate,
  onAddStock,
  isAdding,
  onToggleTracked,
  isTogglingTracked,
  hasActiveSession,
  onToggleNews,
  isTogglingNews,
}: StockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ManualStockInput>>({});
  const [selectedStock, setSelectedStock] = useState<StockRow | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFormExpanded && addFormRef.current) {
      // 약간의 딜레이 후 스크롤 (애니메이션 완료 대기)
      const timer = setTimeout(() => {
        addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isFormExpanded]);

  function startEdit(stock: StockRow) {
    setEditingId(stock.id);
    setEditValues({
      quantity: stock.quantity,
      avg_price: stock.avg_price,
      current_price: stock.current_price,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function saveEdit(id: string) {
    onUpdate(id, editValues);
    setEditingId(null);
    setEditValues({});
  }

  if (stocks.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <p className="text-sm text-muted-foreground">
            종목이 없습니다.
          </p>
          {onAddStock && (
            <div className="w-full max-w-2xl space-y-3 px-4">
              {!isFormExpanded ? (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setIsBulkImportOpen(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    AI 대량 종목 추가
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsFormExpanded(true)}
                    data-stock-add-button
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    종목 추가
                  </Button>
                </div>
              ) : (
                <div className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">종목 추가</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFormExpanded(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <StockForm
                    onSubmit={(data) => {
                      onAddStock(data);
                      setIsFormExpanded(false);
                    }}
                    isSubmitting={isAdding}
                  />
                </div>
              )}
            </div>
          )}

          {onAddStock && (
            <BulkImportDialog
              open={isBulkImportOpen}
              onOpenChange={setIsBulkImportOpen}
              onImport={(importedStocks) => {
                for (const stock of importedStocks) {
                  onAddStock(stock);
                }
              }}
              existingStockCodes={stocks.map((s) => s.stock_code)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-6 border-b">
        <h3 className="shrink-0 font-bold text-lg">보유 종목</h3>
        <ScrollFade className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="shrink-0 text-xs h-8"
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-3" />
              )}
              가격 업데이트
            </Button>
          )}
          {onAddStock && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkImportOpen(true)}
                className="shrink-0 text-xs h-8 gap-1.5"
              >
                <Sparkles className="size-3" />
                AI 대량 추가
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormExpanded(true)}
                className="shrink-0 text-xs h-8"
                data-stock-add-button
              >
                <Plus className="mr-2 size-3" />
                종목 추가
              </Button>
            </>
          )}
        </ScrollFade>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden">
        <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-b-border/50">
            <TableHead className="w-[60px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">추적</TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">종목명</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">수량</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">평단가</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">현재가</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">평가금액</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">손익</TableHead>
            <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">수익률</TableHead>
            <TableHead className="text-right w-[100px] text-xs font-bold text-muted-foreground uppercase tracking-wider">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock, index) => {
            const isEditing = editingId === stock.id;
            const isUsd = stock.currency === "USD";
            const evalAmount = stock.current_price * stock.quantity;
            const profitLoss =
              (stock.current_price - stock.avg_price) * stock.quantity;
            const profitRate =
              stock.avg_price > 0
                ? ((stock.current_price - stock.avg_price) / stock.avg_price) *
                  100
                : 0;

            const evalAmountKrw =
              isUsd && exchangeRate ? evalAmount * exchangeRate : evalAmount;
            const profitLossKrw =
              isUsd && exchangeRate ? profitLoss * exchangeRate : profitLoss;

            return (
              <TableRow
                key={stock.id ?? `stock-${index}`}
                className={cn(
                  "group transition-colors duration-200 border-b-border/40",
                  stock.is_rebalance_tracked === false
                    ? "bg-muted/20"
                    : "hover:bg-muted/30"
                )}
              >
                <TableCell className="text-center align-middle">
                  {onToggleTracked ? (
                    <div className="flex justify-center">
                      <Switch
                        size="sm"
                        checked={stock.is_rebalance_tracked !== false}
                        onCheckedChange={(checked) => onToggleTracked(stock.id, checked)}
                        disabled={isTogglingTracked || (hasActiveSession && stock.is_rebalance_tracked !== false)}
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StockLogo stockCode={stock.stock_code} stockName={stock.stock_name} currency={stock.currency} size="sm" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStock(stock)}
                          className="font-medium text-left hover:text-primary transition-colors"
                        >
                          {stock.stock_name}
                        </button>
                        {stock.is_rebalance_tracked === false && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">리밸런싱 제외</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{stock.stock_code}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-20 text-right"
                      value={editValues.quantity ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          quantity: Number(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    stock.quantity.toLocaleString()
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editValues.avg_price ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          avg_price: Number(e.target.value),
                        }))
                      }
                    />
                  ) : isUsd ? (
                    formatUsdPrice(stock.avg_price)
                  ) : (
                    formatCurrency(stock.avg_price)
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editValues.current_price ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          current_price: Number(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    <div>
                      {isUsd
                        ? formatUsdPrice(stock.current_price)
                        : formatCurrency(stock.current_price)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <div>
                    {isUsd && exchangeRate ? formatCurrency(Math.round(evalAmountKrw)) : formatCurrency(evalAmount)}
                  </div>
                  {isUsd && exchangeRate && (
                    <div className="text-xs text-muted-foreground font-normal">{formatUsdPrice(evalAmount)}</div>
                  )}
                </TableCell>
                <TableCell
                  className={cn("text-right tabular-nums", profitLoss > 0 ? "profit-up" : profitLoss < 0 ? "profit-down" : "")}
                >
                  {profitLoss >= 0 ? "+" : ""}
                  {isUsd && exchangeRate
                    ? formatCurrency(Math.round(profitLossKrw))
                    : formatCurrency(profitLoss)}
                </TableCell>
                <TableCell
                  className={cn("text-right tabular-nums font-medium", profitRate > 0 ? "profit-up" : profitRate < 0 ? "profit-down" : "")}
                >
                  {profitRate >= 0 ? "+" : ""}
                  {formatPercent(profitRate)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon-xs" onClick={() => saveEdit(stock.id)}>
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={cancelEdit}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {onToggleNews && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onToggleNews(stock.id, !stock.news_enabled)}
                            disabled={isTogglingNews}
                            title={stock.news_enabled ? "뉴스 수신 중" : "뉴스 받기"}
                          >
                            <Newspaper className={cn("size-4", stock.news_enabled ? "text-blue-500" : "text-muted-foreground")} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-xs" onClick={() => startEdit(stock)}>
                          <Pencil className="size-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" className="text-destructive/70 hover:text-destructive" onClick={() => onDelete(stock.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Mobile Clean List */}
      <div className="md:hidden">
        {stocks.map((stock, i) => {
          const isEditing = editingId === stock.id;
          const isUsd = stock.currency === "USD";
          const evalAmount = stock.current_price * stock.quantity;
          const profitLoss = (stock.current_price - stock.avg_price) * stock.quantity;
          const profitRate = stock.avg_price > 0 ? ((stock.current_price - stock.avg_price) / stock.avg_price) * 100 : 0;

          const evalAmountKrw = isUsd && exchangeRate ? evalAmount * exchangeRate : evalAmount;
          const profitLossKrw = isUsd && exchangeRate ? profitLoss * exchangeRate : profitLoss;

          return (
            <m.div
              key={stock.id ?? `stock-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="border-b border-border/40 last:border-0"
            >
              <div
                className={cn(
                  "py-2.5 px-4 active:bg-muted/30 transition-colors",
                  isEditing ? "bg-muted/30" : "",
                  stock.is_rebalance_tracked === false && "opacity-50"
                )}
                onClick={() => {
                  if (!isEditing) setSelectedStock(stock);
                }}
              >
                {isEditing ? (
                  // Edit mode: minimal stacked inputs
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg flex-1 min-w-0 truncate">{stock.stock_name}</span>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => saveEdit(stock.id)}>자산수정 완료</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>취소</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">수량</label>
                        <Input
                          type="number"
                          className="w-full bg-background"
                          value={editValues.quantity ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, quantity: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">평단가</label>
                        <Input
                          type="number"
                          className="w-full bg-background"
                          value={editValues.avg_price ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, avg_price: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">현재가</label>
                        <Input
                          type="number"
                          className="w-full bg-background"
                          value={editValues.current_price ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, current_price: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // View mode: Clean list item
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StockLogo stockCode={stock.stock_code} stockName={stock.stock_name} currency={stock.currency} size="default" />
                        <span className="font-semibold text-sm truncate">{stock.stock_name}</span>
                        {isUsd && (
                           <span className="text-[10px] bg-muted text-muted-foreground px-1 py-0.5 rounded">USD</span>
                        )}
                        {stock.is_rebalance_tracked === false && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1 py-0.5 rounded">제외</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {stock.quantity.toLocaleString()}주 · {isUsd ? formatUsdPrice(stock.current_price) : formatCurrency(stock.current_price)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold tabular-nums text-sm">
                        {isUsd && exchangeRate ? formatCurrency(evalAmountKrw) : formatCurrency(evalAmount)}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs tabular-nums">
                        <span className={profitRate > 0 ? "profit-up" : profitRate < 0 ? "profit-down" : ""}>
                          {profitRate >= 0 ? "+" : ""}{formatPercent(profitRate)}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span className={profitLoss > 0 ? "profit-up" : profitLoss < 0 ? "profit-down" : ""}>
                           {profitLoss >= 0 ? "+" : ""}{isUsd && exchangeRate ? formatCurrency(Math.round(profitLossKrw)) : formatCurrency(profitLoss)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!isEditing && (
                  <div className="mt-3 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     {/* Hidden edit actions on mobile list to act like native app tap-to-view, but keeping long-press or swipe actions in mind for future. For now, rely on tap-to-view sheet for details, maybe put edit there? Or just keep simple tap. */}
                  </div>
                )}
                
                {/* Swipe-like actions could go here, but for now we put a tiny more menu or just rely on the Detail Sheet to have edit options? 
                    Let's add a long-press or just a small 'edit' button if needed, but 'Toss' usually hides complex actions.
                    For this MVP, we will stick to the row tap opening details.
                    However, we need a way to Delete/Edit. Let's add that to the detail sheet or a small trigger.
                 */}
                 {!isEditing && (
                    <div className="flex justify-end mt-1.5 md:hidden">
                       {onToggleTracked && (
                         <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                           <Switch
                             size="sm"
                             checked={stock.is_rebalance_tracked !== false}
                             onCheckedChange={(checked) => onToggleTracked(stock.id, checked)}
                             disabled={isTogglingTracked || (hasActiveSession && stock.is_rebalance_tracked !== false)}
                           />
                           <span className="text-[10px] text-muted-foreground">
                             {stock.is_rebalance_tracked === false ? "제외됨" : "추적중"}
                           </span>
                         </div>
                       )}
                       {onToggleNews && (
                         <button
                           className={cn(
                             "text-xs px-2 py-1 rounded-md",
                             stock.news_enabled
                               ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                               : "text-muted-foreground hover:bg-muted"
                           )}
                           onClick={(e) => {
                             e.stopPropagation();
                             onToggleNews(stock.id, !stock.news_enabled);
                           }}
                           disabled={isTogglingNews}
                         >
                           {stock.news_enabled ? "뉴스 ON" : "뉴스"}
                         </button>
                       )}
                       <button
                         className="text-xs text-muted-foreground px-2 py-1 rounded-md hover:bg-muted"
                         onClick={(e) => {
                             e.stopPropagation();
                             startEdit(stock);
                         }}
                       >
                         수정
                       </button>
                       <button
                         className="text-xs text-red-500 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                         onClick={(e) => {
                             e.stopPropagation();
                             onDelete(stock.id);
                         }}
                       >
                         삭제
                       </button>
                    </div>
                 )}
              </div>
            </m.div>
          );
        })}
      </div>

      {/* 종목 추가 인라인 폼 */}
      {onAddStock && isFormExpanded && (
        <div ref={addFormRef} className="p-4 border-t bg-muted/20">
          <AnimatePresence mode="wait">
            <m.div
              key="add-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">종목 추가</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormExpanded(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <StockForm
                  onSubmit={(data) => {
                    onAddStock(data);
                    setIsFormExpanded(false);
                  }}
                  isSubmitting={isAdding}
                />
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      )}

      {selectedStock && (
        <StockChartSheet
          stock={selectedStock}
          open={!!selectedStock}
          onOpenChange={(open) => {
            if (!open) setSelectedStock(null);
          }}
          exchangeRate={exchangeRate}
        />
      )}

      {onAddStock && (
        <BulkImportDialog
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onImport={(importedStocks) => {
            for (const stock of importedStocks) {
              onAddStock(stock);
            }
          }}
          existingStockCodes={stocks.map((s) => s.stock_code)}
        />
      )}
    </div>
  );
}
