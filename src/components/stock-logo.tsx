"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStockColor, getStockInitials } from "@/lib/utils/stock-logo";
import { cn } from "@/lib/utils";

interface StockLogoProps {
  stockCode: string;
  stockName: string;
  currency?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function StockLogo({
  stockCode,
  stockName,
  currency,
  size = "sm",
  className,
}: StockLogoProps) {
  const bgColor = getStockColor(stockCode);
  const initials = getStockInitials(stockName, stockCode, currency);

  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      <AvatarFallback
        className="font-semibold text-white"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
