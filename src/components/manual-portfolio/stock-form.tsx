"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StockCombobox } from "@/components/stock-combobox";
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";

const stockSchema = z.object({
  stock_code: z
    .string()
    .min(1, "종목코드를 입력해주세요.")
    .max(10, "종목코드는 10자리까지입니다."),
  stock_name: z.string().min(1, "종목명을 입력해주세요."),
  quantity: z.coerce.number().int().min(1, "수량은 1 이상이어야 합니다."),
  avg_price: z.coerce.number().min(0, "평균매입가는 0 이상이어야 합니다."),
  current_price: z.coerce.number().min(0, "현재가는 0 이상이어야 합니다."),
});

interface StockFormValues {
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
}

interface StockFormProps {
  onSubmit: (data: ManualStockInput) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<StockFormValues>;
  submitLabel?: string;
}

export function StockForm({
  onSubmit,
  isSubmitting,
  defaultValues,
  submitLabel = "종목 추가",
}: StockFormProps) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [currency, setCurrency] = useState("KRW");

  const form = useForm<StockFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockSchema) as any,
    defaultValues: {
      stock_code: "",
      stock_name: "",
      quantity: "" as unknown as number,
      avg_price: "" as unknown as number,
      current_price: "" as unknown as number,
      ...defaultValues,
    },
  });

  async function fetchCurrentPrice(code: string, currency: string, market?: string) {
    setIsFetchingPrice(true);
    try {
      const params = new URLSearchParams({ code, currency });
      if (market) params.set("market", market);
      const res = await fetch(`/api/stocks/price?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.price === "number") {
        form.setValue("current_price", data.price, { shouldValidate: true });
      }
    } catch {
      // silently fail - user can still enter manually
    } finally {
      setIsFetchingPrice(false);
    }
  }

  function handleSubmit(values: StockFormValues) {
    onSubmit({ ...values, currency });
    if (!defaultValues) {
      form.reset();
      setCurrency("KRW");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <FormItem>
          <FormLabel>종목</FormLabel>
          <StockCombobox
            onSelect={(stock) => {
              const cur = stock.currency ?? "KRW";
              form.setValue("stock_code", stock.stock_code, { shouldValidate: true });
              form.setValue("stock_name", stock.stock_name, { shouldValidate: true });
              setCurrency(cur);
              fetchCurrentPrice(stock.stock_code, cur, stock.market);
            }}
            defaultValue={
              defaultValues?.stock_code && defaultValues?.stock_name
                ? { stock_code: defaultValues.stock_code, stock_name: defaultValues.stock_name }
                : undefined
            }
          />
          {(form.formState.errors.stock_code || form.formState.errors.stock_name) && (
            <p className="text-destructive text-sm">
              {form.formState.errors.stock_code?.message ||
                form.formState.errors.stock_name?.message}
            </p>
          )}
        </FormItem>
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>수량</FormLabel>
              <FormControl>
                <Input type="number" placeholder="100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avg_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>평균매입가</FormLabel>
              <FormControl>
                <Input type="number" placeholder="60000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="current_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>현재가</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="number" placeholder="65000" {...field} />
                  {isFetchingPrice && (
                    <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
