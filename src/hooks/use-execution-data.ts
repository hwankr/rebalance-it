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
  profile_name: string;
  profile_id: string;
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
        setData(JSON.parse(raw));
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
