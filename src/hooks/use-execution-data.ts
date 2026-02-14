"use client";

import { useState, useEffect, useCallback } from "react";

interface SimulationData {
  orders: Array<{
    stock_code: string;
    stock_name: string;
    side: "buy" | "sell";
    quantity: number;
    estimated_price: number;
    estimated_amount: number;
  }>;
  account: string;
  preset_name?: string;
  /** @deprecated 레거시 호환용 - preset_name 우선 사용 */
  profile_name?: string;
  /** @deprecated 레거시 호환용 */
  profile_id?: string;
  total_buy_amount: number;
  total_sell_amount: number;
  net_cash_change: number;
}

const STORAGE_KEY = "rebalance-it-simulation";

export function useExecutionData() {
  const [data, setData] = useState<SimulationData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SimulationData;
        // 레거시 fallback: preset_name이 없으면 profile_name에서 가져옴
        if (!parsed.preset_name && parsed.profile_name) {
          parsed.preset_name = parsed.profile_name;
        }
        setData(parsed);
      }
    } catch {
      // sessionStorage unavailable or corrupted
    }
  }, []);

  const save = useCallback((newData: SimulationData) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setData(newData);
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setData(null);
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  return { data, save, clear };
}
