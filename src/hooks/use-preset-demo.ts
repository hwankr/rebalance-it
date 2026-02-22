"use client";

import { useState, useMemo, useCallback } from "react";

// --- Types ---

export type PresetId = "aggressive" | "balanced" | "conservative";

export interface Asset {
  id: string;
  name: string;
  target: number;
  color: string;
}

export interface PresetScenario {
  id: PresetId;
  label: string;
  description: string;
  assets: Asset[];
  defaultAllocations: Record<string, number>;
}

export interface DemoResult {
  id: string;
  name: string;
  color: string;
  target: number;
  diff: number;
  amount: number;
  action: "매도" | "매수" | "유지";
}

// --- Preset Data ---

export const PRESETS: PresetScenario[] = [
  {
    id: "aggressive",
    label: "공격적",
    description: "주식 비중이 높은 성장 중심 포트폴리오",
    assets: [
      { id: "us", name: "미국 주식", target: 50, color: "#2563eb" },
      { id: "kr", name: "한국 주식", target: 30, color: "#10b981" },
      { id: "cash", name: "현금", target: 10, color: "#f59e0b" },
      { id: "gold", name: "금", target: 10, color: "#8b5cf6" },
    ],
    defaultAllocations: { us: 62, kr: 20, cash: 8, gold: 10 },
  },
  {
    id: "balanced",
    label: "균형",
    description: "모든 자산에 균등하게 분산하는 포트폴리오",
    assets: [
      { id: "us", name: "미국 주식", target: 25, color: "#2563eb" },
      { id: "kr", name: "한국 주식", target: 25, color: "#10b981" },
      { id: "cash", name: "현금", target: 25, color: "#f59e0b" },
      { id: "gold", name: "금", target: 25, color: "#8b5cf6" },
    ],
    defaultAllocations: { us: 35, kr: 30, cash: 15, gold: 20 },
  },
  {
    id: "conservative",
    label: "보수적",
    description: "현금과 안전자산 중심의 안정적 포트폴리오",
    assets: [
      { id: "us", name: "미국 주식", target: 15, color: "#2563eb" },
      { id: "kr", name: "한국 주식", target: 15, color: "#10b981" },
      { id: "cash", name: "현금", target: 45, color: "#f59e0b" },
      { id: "gold", name: "금", target: 25, color: "#8b5cf6" },
    ],
    defaultAllocations: { us: 20, kr: 22, cash: 35, gold: 23 },
  },
];

const DEFAULT_TOTAL_AMOUNT = 10_000_000;

// --- Hook ---

export interface UsePresetDemoReturn {
  presets: PresetScenario[];
  activePreset: PresetId;
  setActivePreset: (id: PresetId) => void;
  assets: Asset[];
  allocations: Record<string, number>;
  setAllocation: (assetId: string, value: number) => void;
  allocationSum: number;
  totalAmount: number;
  setTotalAmount: (amount: number) => void;
  results: DemoResult[];
  sortedResults: DemoResult[];
  totalDeviation: number;
}

export function usePresetDemo(): UsePresetDemoReturn {
  const [activePreset, setActivePresetRaw] = useState<PresetId>("balanced");
  const [allocations, setAllocations] = useState<Record<string, number>>(
    PRESETS[1].defaultAllocations
  );
  const [totalAmount, setTotalAmount] = useState(DEFAULT_TOTAL_AMOUNT);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === activePreset)!,
    [activePreset]
  );

  const assets = useMemo(() => preset.assets, [preset]);

  const setActivePreset = useCallback((id: PresetId) => {
    const next = PRESETS.find((p) => p.id === id)!;
    setActivePresetRaw(id);
    setAllocations({ ...next.defaultAllocations });
  }, []);

  const setAllocation = useCallback((assetId: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [assetId]: value }));
  }, []);

  const allocationSum = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + v, 0),
    [allocations]
  );

  const results = useMemo<DemoResult[]>(
    () =>
      assets.map((a) => {
        const diff = (allocations[a.id] ?? 0) - a.target;
        return {
          id: a.id,
          name: a.name,
          color: a.color,
          target: a.target,
          diff,
          amount: Math.abs(Math.round((diff / 100) * totalAmount)),
          action:
            diff > 1
              ? ("매도" as const)
              : diff < -1
                ? ("매수" as const)
                : ("유지" as const),
        };
      }),
    [assets, allocations, totalAmount]
  );

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    [results]
  );

  const totalDeviation = useMemo(
    () => results.reduce((sum, r) => sum + Math.abs(r.diff), 0),
    [results]
  );

  return {
    presets: PRESETS,
    activePreset,
    setActivePreset,
    assets,
    allocations,
    setAllocation,
    allocationSum,
    totalAmount,
    setTotalAmount,
    results,
    sortedResults,
    totalDeviation,
  };
}
