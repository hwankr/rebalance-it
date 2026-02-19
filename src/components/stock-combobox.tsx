"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronsUpDown, Check, Sparkles, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStockSearch, type StockItem } from "@/hooks/use-stock-search";
import { useAIStockSearch, isNaturalLanguageQuery } from "@/hooks/use-ai-stock-search";

interface StockComboboxProps {
  onSelect: (stock: { stock_code: string; stock_name: string; currency?: string; market?: string }) => void;
  defaultValue?: { stock_code: string; stock_name: string };
  placeholder?: string;
  disabled?: boolean;
}

function getDisplayName(stock: StockItem): string {
  if (stock.country === "KR") {
    return stock.stock_name;
  }
  if (stock.stock_name_ko) {
    return `${stock.stock_name_ko} (${stock.stock_name})`;
  }
  return stock.stock_name;
}

function getSelectedName(stock: StockItem): string {
  if (stock.country === "KR") {
    return stock.stock_name;
  }
  return stock.stock_name_ko || stock.stock_name;
}

export function StockCombobox({
  onSelect,
  defaultValue,
  placeholder = "종목 검색...",
  disabled = false,
}: StockComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<{
    stock_code: string;
    stock_name: string;
  } | null>(defaultValue ?? null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { results: localResults, isLoading: isLocalLoading } = useStockSearch(debouncedQuery);
  const isNL = isNaturalLanguageQuery(debouncedQuery);
  const { results: aiResults, isLoading: isAILoading } = useAIStockSearch(debouncedQuery, open);

  // Use AI results when NL query detected, otherwise fall back to local search
  const results = isNL && aiResults.length > 0 ? aiResults : localResults;
  const isLoading = isNL ? isAILoading : isLocalLoading;

  const handleSelect = useCallback(
    (stock: StockItem) => {
      const name = getSelectedName(stock);
      const value = { stock_code: stock.stock_code, stock_name: name, currency: stock.currency, market: stock.market };
      setSelected(value);
      onSelect(value);
      setOpen(false);
      setQuery("");
    },
    [onSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-auto min-h-11 py-1.5",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <div className="flex flex-col items-start min-w-0">
              <span className="font-medium truncate w-full text-sm">{selected.stock_name}</span>
              <span className="text-xs text-muted-foreground font-mono">{selected.stock_code}</span>
            </div>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="종목코드, 종목명 또는 자연어 검색 (예: 반도체 ETF)"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                {isNL ? (
                  <>
                    <Sparkles className="size-4 text-primary animate-pulse" />
                    AI 검색 중...
                  </>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    검색 중...
                  </>
                )}
              </div>
            )}
            {!isLoading && debouncedQuery.length > 0 && results.length === 0 && (
              <CommandEmpty>
                {isNL ? "AI 검색 결과가 없습니다" : "검색 결과가 없습니다"}
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading={isNL ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3 text-primary" />
                  AI 검색 결과
                </span>
              ) : undefined}>
                {results.map((stock) => (
                  <CommandItem
                    key={stock.stock_code}
                    value={stock.stock_code}
                    onSelect={() => handleSelect(stock)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selected?.stock_code === stock.stock_code
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {stock.stock_code}
                      </span>
                      <span className="truncate text-sm">
                        {getDisplayName(stock)}
                      </span>
                      {/* ETF badge - handles undefined asset_type from cached old data */}
                      {stock.asset_type === "ETF" && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs px-1.5 py-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                        >
                          ETF
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 text-xs px-1.5 py-0"
                      >
                        {stock.market}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
