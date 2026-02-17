"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockForm } from "@/components/manual-portfolio/stock-form";
import type { ManualStockInput, ManualStockRow } from "@/hooks/use-manual-portfolio";

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
  onAddStock: (data: ManualStockInput) => void;
  isAdding: boolean;
  onRefreshPrices?: () => void;
  isRefreshing?: boolean;
  defaultExpanded?: boolean;
}

export function PortfolioEditSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  portfolio,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stocks,
  onAddStock,
  isAdding,
  defaultExpanded = false,
}: PortfolioEditSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
              종목 추가
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
        </CardContent>
      )}
    </Card>
  );
}
