"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { RebalanceProfile } from "@/lib/rebalance/profile-types";

const profileSchema = z
  .object({
    name: z.string().min(1, "프로필 이름을 입력해주세요."),
    strategy: z.enum(["threshold", "calendar", "hybrid"]),
    threshold_pct: z.number().min(0.1).max(50),
    calendar_interval: z
      .enum(["monthly", "quarterly", "yearly"])
      .optional(),
    targets: z
      .array(
        z.object({
          stock_code: z.string().min(1, "종목코드를 입력해주세요."),
          stock_name: z.string().min(1, "종목명을 입력해주세요."),
          target_pct: z.number().min(0).max(100),
        }),
      )
      .min(1, "최소 1개 종목을 추가해주세요."),
  })
  .refine(
    (data) => {
      const sum = data.targets.reduce((s, t) => s + t.target_pct, 0);
      return sum <= 100;
    },
    {
      message: "비중 합계가 100%를 초과합니다.",
      path: ["targets"],
    },
  );

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData?: RebalanceProfile;
  onSubmit: (data: ProfileFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ProfileForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          strategy: initialData.strategy,
          threshold_pct: initialData.threshold_pct,
          calendar_interval: initialData.calendar_interval,
          targets: initialData.targets,
        }
      : {
          name: "",
          strategy: "threshold",
          threshold_pct: 5.0,
          calendar_interval: undefined,
          targets: [{ stock_code: "", stock_name: "", target_pct: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "targets",
  });

  const watchStrategy = form.watch("strategy");
  const watchTargets = form.watch("targets");

  const totalPct = watchTargets.reduce(
    (sum, t) => sum + (Number(t.target_pct) || 0),
    0,
  );

  const showThreshold =
    watchStrategy === "threshold" || watchStrategy === "hybrid";
  const showCalendar =
    watchStrategy === "calendar" || watchStrategy === "hybrid";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 프로필 이름 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>프로필 이름</FormLabel>
              <FormControl>
                <Input placeholder="예: 국내 ETF 포트폴리오" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 전략 선택 */}
        <FormField
          control={form.control}
          name="strategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>리밸런싱 전략</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="전략을 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="threshold">임계값 기반</SelectItem>
                  <SelectItem value="calendar">정기 리밸런싱</SelectItem>
                  <SelectItem value="hybrid">혼합 (임계값 + 정기)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 임계값 */}
        {showThreshold && (
          <FormField
            control={form.control}
            name="threshold_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>리밸런싱 임계값 (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 리밸런싱 주기 */}
        {showCalendar && (
          <FormField
            control={form.control}
            name="calendar_interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>리밸런싱 주기</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="주기를 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">매월</SelectItem>
                    <SelectItem value="quarterly">분기별</SelectItem>
                    <SelectItem value="yearly">연간</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 종목 목표 비중 */}
        <div className="space-y-3">
          <FormLabel>종목 목표 비중</FormLabel>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`targets.${index}.stock_code`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="종목코드"
                        className="w-28"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`targets.${index}.stock_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="종목명"
                        className="w-40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`targets.${index}.target_pct`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="%"
                        className="w-20"
                        step="0.1"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {/* 종목 추가 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ stock_code: "", stock_name: "", target_pct: 0 })
            }
          >
            <Plus className="size-4" />
            종목 추가
          </Button>

          {/* 비중 합계 */}
          <p
            className={`text-sm ${totalPct > 100 ? "text-destructive" : "text-muted-foreground"}`}
          >
            비중 합계: {totalPct.toFixed(1)}%
          </p>

          {/* targets 배열 레벨 에러 */}
          {form.formState.errors.targets?.root?.message && (
            <p className="text-destructive text-sm">
              {form.formState.errors.targets.root.message}
            </p>
          )}
          {typeof form.formState.errors.targets?.message === "string" && (
            <p className="text-destructive text-sm">
              {form.formState.errors.targets.message}
            </p>
          )}
        </div>

        {/* 저장/취소 버튼 */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading}>
            <Save className="size-4" />
            {initialData ? "수정" : "저장"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              취소
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
