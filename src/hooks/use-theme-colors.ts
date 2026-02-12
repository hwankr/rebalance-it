"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const CHART_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const;

// Fallback colors if CSS vars can't be resolved
const FALLBACK_LIGHT = ["#4f46e5", "#0d9488", "#16a34a", "#7c3aed", "#d97706"];
const FALLBACK_DARK = ["#818cf8", "#2dd4bf", "#4ade80", "#a78bfa", "#fbbf24"];

function resolveOklchToHex(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  // Try to use a temporary element to resolve the computed color
  try {
    const el = document.createElement("div");
    el.style.color = raw.trim();
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    if (computed && computed !== "") {
      return computed;
    }
  } catch {
    // Fallback
  }
  return null;
}

export function useThemeColors(): string[] {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<string[]>(FALLBACK_LIGHT);

  useEffect(() => {
    const fallback = resolvedTheme === "dark" ? FALLBACK_DARK : FALLBACK_LIGHT;

    // Small delay to ensure CSS vars are applied after theme switch
    const timer = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      const resolved = CHART_VARS.map((varName, i) => {
        const raw = style.getPropertyValue(varName).trim();
        return resolveOklchToHex(raw) || fallback[i];
      });
      setColors(resolved);
    });

    return () => cancelAnimationFrame(timer);
  }, [resolvedTheme]);

  return colors;
}
