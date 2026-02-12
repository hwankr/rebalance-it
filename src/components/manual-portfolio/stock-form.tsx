"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";

const stockSchema = z.object({
  stock_code: z
    .string()
    .min(1, "종목코드를 입력해주세요.")
    .max(6, "종목코드는 6자리까지입니다."),
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
  const form = useForm<StockFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockSchema) as any,
    defaultValues: {
      stock_code: "",
      stock_name: "",
      quantity: undefined as unknown as number,
      avg_price: undefined as unknown as number,
      current_price: undefined as unknown as number,
      ...defaultValues,
    },
  });

  function handleSubmit(values: StockFormValues) {
    onSubmit(values);
    if (!defaultValues) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-2 gap-3 sm:grid-cols-6"
      >
        <FormField
          control={form.control}
          name="stock_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>종목코드</FormLabel>
              <FormControl>
                <Input placeholder="005930" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>종목명</FormLabel>
              <FormControl>
                <Input placeholder="삼성전자" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <Input type="number" placeholder="65000" {...field} />
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
