"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Shared pill-styled Select trigger class for filter bars */
export const PILL_SELECT_TRIGGER =
  "rounded-full border-0 bg-muted text-muted-foreground hover:bg-accent px-3 py-1.5 text-xs font-medium h-auto shadow-none gap-1 min-w-fit data-[state=open]:bg-foreground data-[state=open]:text-background";

interface PillButtonProps {
  active?: boolean;
  size?: "sm" | "default";
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export function PillButton({
  active = false,
  size = "default",
  onClick,
  className,
  children,
}: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full font-medium transition-colors",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface PillToggleOption<T extends string> {
  value: T;
  label: string;
}

interface PillToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: PillToggleOption<T>[];
  size?: "sm" | "default";
}

export function PillToggle<T extends string>({
  value,
  onChange,
  options,
  size = "default",
}: PillToggleProps<T>) {
  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <PillButton
          key={option.value}
          active={value === option.value}
          size={size}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </PillButton>
      ))}
    </div>
  );
}
