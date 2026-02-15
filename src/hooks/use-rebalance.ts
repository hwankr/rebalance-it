"use client";

import { useMutation } from "@tanstack/react-query";
import type { PortfolioItem, TargetAllocation, RebalanceResult } from "@/lib/rebalance/types";

type SimulationResult = RebalanceResult & {
  cash_sufficient: boolean;
  cash_shortfall: number;
};

interface SimulationParams {
  portfolio: PortfolioItem[];
  targets: TargetAllocation[];
  cash: number;
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

export function useRebalanceSimulation() {
  return useMutation({
    mutationFn: simulateRebalance,
  });
}
