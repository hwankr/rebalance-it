"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";

interface ProgressiveOrderListProps {
  orders: ExecutionOrderResult[];
  side: "sell" | "buy";
  stepNumber: number;
  onToggle: (stockCode: string, executed: boolean) => void;
  disabled?: boolean;
  showCheckbox?: boolean;
}

export function ProgressiveOrderList({
  orders,
  side,
  stepNumber,
  onToggle,
  disabled = false,
  showCheckbox = true,
}: ProgressiveOrderListProps) {
  const filtered = orders.filter((o) => o.side === side);
  const completedCount = filtered.filter((o) => o.executed).length;

  if (filtered.length === 0) return null;

  const isSell = side === "sell";
  const badgeColor = isSell
    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
    : "bg-green-500/10 text-green-600 hover:bg-green-500/20";
  const title = isSell ? "매도할 종목" : "매수할 종목";
  const description = isSell
    ? "현금을 확보하기 위해 아래 종목을 먼저 매도하세요."
    : "매도 완료 후 아래 종목을 매수하세요.";

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: stepNumber * 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={badgeColor}>{stepNumber}단계</Badge>
              <CardTitle>{title}</CardTitle>
            </div>
            {showCheckbox && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {completedCount}/{filtered.length} 완료
              </span>
            )}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {showCheckbox && <TableHead className="w-12">완료</TableHead>}
                  <TableHead>종목명</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">예상 가격</TableHead>
                  <TableHead className="text-right">예상 금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow
                    key={order.stock_code}
                    className={cn(
                      "transition-colors duration-150",
                      showCheckbox && order.executed && "opacity-50"
                    )}
                  >
                    {showCheckbox && (
                      <TableCell>
                        <Checkbox
                          checked={order.executed ?? false}
                          onCheckedChange={(checked) =>
                            onToggle(order.stock_code, checked === true)
                          }
                          disabled={disabled}
                        />
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        "font-medium",
                        showCheckbox && order.executed && "line-through"
                      )}
                    >
                      {order.stock_name}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        showCheckbox && order.executed && "line-through"
                      )}
                    >
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
            {filtered.map((order, i) => (
              <m.div
                key={order.stock_code}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <div
                  className={cn(
                    "glass-card rounded-xl p-4 transition-opacity",
                    showCheckbox && order.executed && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {showCheckbox && (
                      <Checkbox
                        checked={order.executed ?? false}
                        onCheckedChange={(checked) =>
                          onToggle(order.stock_code, checked === true)
                        }
                        disabled={disabled}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "font-semibold",
                            showCheckbox && order.executed && "line-through"
                          )}
                        >
                          {order.stock_name}
                        </span>
                        {showCheckbox && order.executed ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600/30"
                          >
                            <Check className="size-3 mr-1" />
                            완료
                          </Badge>
                        ) : (
                          <Badge className={badgeColor}>
                            {isSell ? "매도" : "매수"}
                          </Badge>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-sm text-muted-foreground tabular-nums",
                          showCheckbox && order.executed && "line-through"
                        )}
                      >
                        {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                        {formatCurrency(order.estimated_price)} ={" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(order.estimated_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
