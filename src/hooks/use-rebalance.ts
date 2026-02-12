"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioItem, TargetAllocation, RebalanceResult, RebalanceOrder } from "@/lib/rebalance/types";

type SimulationResult = RebalanceResult & {
  cash_sufficient: boolean;
  cash_shortfall: number;
};

interface SimulationParams {
  portfolio: PortfolioItem[];
  targets: TargetAllocation[];
  cash: number;
}

interface ExecutionParams {
  orders: RebalanceOrder[];
  account: string;
}

interface ExecutionResult {
  total: number;
  success_count: number;
  fail_count: number;
  results: Array<{
    stock_code: string;
    stock_name: string;
    side: "buy" | "sell";
    quantity: number;
    success: boolean;
    error?: string;
  }>;
}

async function simulateRebalance(
  params: SimulationParams
): Promise<SimulationResult> {
  const res = await fetch("/api/rebalance/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "리밸런싱 시뮬레이션에 실패했습니다.");
  }
  return res.json();
}

async function executeRebalance(
  params: ExecutionParams
): Promise<ExecutionResult> {
  const res = await fetch("/api/rebalance/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok && res.status !== 207) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "리밸런싱 실행에 실패했습니다.");
  }
  return res.json();
}

export function useRebalanceSimulation() {
  return useMutation({
    mutationFn: simulateRebalance,
  });
}

export function useRebalanceExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeRebalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
