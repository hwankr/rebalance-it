"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, RotateCcw, Check, ChevronDown, ChevronUp } from "lucide-react";
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
import { StockForm } from "@/components/manual-portfolio/stock-form";
import type { ManualStockInput, ManualStockRow } from "@/hooks/use-manual-portfolio";

const cashSchema = z.object({
  cash: z.coerce.number().min(0, "예수금은 0 이상이어야 합니다."),
});

interface CashFormValues {
  cash: number;
}

interface ManualPortfolioRow {
  id: string;
  user_id: string;
  cash: number;
  active_preset_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PortfolioEditSectionProps {
  portfolio: ManualPortfolioRow | null;
  stocks: ManualStockRow[];
  exchangeRate: number;
  apiRate: number;
  updatedAt: string | null;
  isManualRate: boolean;
  onSetManualRate: (rate: number) => void;
  onClearManualRate: () => void;
  onSetCash: (cash: number) => void;
  onAddStock: (data: ManualStockInput) => void;
  isAdding: boolean;
  onRefreshPrices?: () => void;
  isRefreshing?: boolean;
  defaultExpanded?: boolean;
}

export function PortfolioEditSection({
  portfolio,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stocks,
  exchangeRate,
  apiRate,
  updatedAt,
  isManualRate,
  onSetManualRate,
  onClearManualRate,
  onSetCash,
  onAddStock,
  isAdding,
  defaultExpanded = false,
}: PortfolioEditSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editRateValue, setEditRateValue] = useState("");

  const cashForm = useForm<CashFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cashSchema) as any,
    values: { cash: portfolio?.cash ? Number(portfolio.cash) : 0 },
  });

  function handleCashSubmit(values: CashFormValues) {
    onSetCash(values.cash);
    toast.success("예수금이 설정되었습니다.");
  }

  function handleAddStock(data: ManualStockInput) {
    onAddStock(data);
    toast.success(`${data.stock_name} 종목이 추가되었습니다.`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>포트폴리오 편집</CardTitle>
            <CardDescription>
              종목 추가, 예수금 및 환율 설정
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                펼치기
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* 종목 추가 섹션 */}
          <div>
            <h3 className="text-sm font-medium mb-3">종목 추가</h3>
            <StockForm onSubmit={handleAddStock} isSubmitting={isAdding} />
          </div>

          <div className="border-t" />

          {/* 예수금 설정 섹션 */}
          <div>
            <h3 className="text-sm font-medium mb-3">예수금 설정</h3>
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
          </div>

          <div className="border-t" />

          {/* 환율 설정 섹션 */}
          <div>
            <h3 className="text-sm font-medium mb-3">환율 설정</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">USD/KRW</span>
                  {isManualRate && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      수동
                    </Badge>
                  )}
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
                          onSetManualRate(parsed);
                          toast.success("환율이 수동 설정되었습니다.");
                        }
                        setIsEditingRate(false);
                      } else if (e.key === "Escape") {
                        setIsEditingRate(false);
                      }
                    }}
                    className="text-lg font-mono tabular-nums max-w-xs"
                    autoFocus
                  />
                ) : (
                  <div className="text-2xl tabular-nums font-mono">
                    {exchangeRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isManualRate
                    ? `자동: ${apiRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`
                    : updatedAt
                      ? `기준: ${format(new Date(updatedAt), "yy.MM.dd HH:mm")}`
                      : "갱신 시간 알 수 없음"}
                </p>
              </div>
              <div className="flex gap-2">
                {isEditingRate ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const parsed = parseFloat(editRateValue);
                      if (!isNaN(parsed) && parsed > 0) {
                        onSetManualRate(parsed);
                        toast.success("환율이 수동 설정되었습니다.");
                      }
                      setIsEditingRate(false);
                    }}
                  >
                    <Check className="size-4 mr-2" />
                    확인
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditRateValue(String(exchangeRate));
                      setIsEditingRate(true);
                    }}
                  >
                    <Pencil className="size-4 mr-2" />
                    수정
                  </Button>
                )}
                {isManualRate && !isEditingRate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClearManualRate();
                      toast.success("자동 환율로 복원되었습니다.");
                    }}
                  >
                    <RotateCcw className="size-4 mr-2" />
                    복원
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
