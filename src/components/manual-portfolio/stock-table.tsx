"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";

interface StockRow {
  id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  updated_at: string;
}

interface StockTableProps {
  stocks: StockRow[];
  onUpdate: (id: string, updates: Partial<ManualStockInput>) => void;
  onDelete: (id: string) => void;
}

export function StockTable({ stocks, onUpdate, onDelete }: StockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ManualStockInput>>({});

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
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        종목이 없습니다. 위 폼에서 종목을 추가해주세요.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>종목코드</TableHead>
          <TableHead>종목명</TableHead>
          <TableHead className="text-right">수량</TableHead>
          <TableHead className="text-right">평균매입가</TableHead>
          <TableHead className="text-right">현재가</TableHead>
          <TableHead className="text-right">평가금액</TableHead>
          <TableHead className="text-right">손익</TableHead>
          <TableHead className="text-right">수익률</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock) => {
          const isEditing = editingId === stock.id;
          const evalAmount = stock.current_price * stock.quantity;
          const profitLoss = (stock.current_price - stock.avg_price) * stock.quantity;
          const profitRate =
            stock.avg_price > 0
              ? ((stock.current_price - stock.avg_price) / stock.avg_price) * 100
              : 0;

          return (
            <TableRow key={stock.id}>
              <TableCell className="font-mono text-sm">
                {stock.stock_code}
              </TableCell>
              <TableCell>{stock.stock_name}</TableCell>
              <TableCell className="text-right">
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
              <TableCell className="text-right">
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
                ) : (
                  formatCurrency(stock.avg_price)
                )}
              </TableCell>
              <TableCell className="text-right">
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
                  formatCurrency(stock.current_price)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(evalAmount)}
              </TableCell>
              <TableCell
                className={`text-right ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profitLoss >= 0 ? "+" : ""}
                {formatCurrency(profitLoss)}
              </TableCell>
              <TableCell
                className={`text-right ${profitRate >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profitRate >= 0 ? "+" : ""}
                {formatPercent(profitRate)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveEdit(stock.id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(stock)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onDelete(stock.id)}
                      >
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
  );
}
