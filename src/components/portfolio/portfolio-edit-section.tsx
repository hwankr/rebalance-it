"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  created_at: string;
  updated_at: string;
}

interface PortfolioEditSectionProps {
  portfolio: ManualPortfolioRow | null;
  stocks: ManualStockRow[];
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
  onSetCash,
  onAddStock,
  isAdding,
  defaultExpanded = false,
}: PortfolioEditSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
              종목 추가 및 예수금 설정
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
        <CardContent className="space-y-3 md:space-y-4">
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

        </CardContent>
      )}
    </Card>
  );
}
