"use client";

import type { Stock } from "@/lib/rebalance/types";
import type { StockAccountMap } from "@/hooks/use-consolidated-portfolio";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/stock-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ConsolidatedStockListProps {
  stocks: Stock[];
  stockAccountMap: StockAccountMap;
  filterAccountId?: string;
}

export function ConsolidatedStockList({
  stocks,
  stockAccountMap,
  filterAccountId,
}: ConsolidatedStockListProps) {
  if (stocks.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            필터 조건에 맞는 종목이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-1">
          {stocks.map((stock) => {
            const mapKey = `${stock.stock_code}:${stock.currency ?? "KRW"}`;
            // When filtered by a specific account, all stocks are from that account — badges are redundant
            const accountNames = filterAccountId ? undefined : stockAccountMap[mapKey];
            return (
              <div
                key={mapKey}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <StockLogo
                    stockCode={stock.stock_code}
                    stockName={stock.stock_name}
                    currency={stock.currency}
                    size="default"
                  />
                  <div>
                    <div className="font-medium text-sm">
                      {stock.stock_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stock.stock_code} ·{" "}
                      {stock.quantity.toLocaleString("ko-KR")}주
                    </div>
                    {accountNames && accountNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {accountNames.map((name) => (
                          <Badge
                            key={name}
                            variant="outline"
                            className="text-[11px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm tabular-nums">
                    {formatCurrency(stock.eval_amount)}
                  </div>
                  <div
                    className={cn(
                      "text-xs tabular-nums",
                      stock.profit_rate > 0 && "profit-up",
                      stock.profit_rate < 0 && "profit-down",
                    )}
                  >
                    {stock.profit_rate > 0 ? "+" : ""}
                    {stock.profit_rate.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
