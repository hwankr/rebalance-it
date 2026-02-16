"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type RebalancePhase = "sell" | "buy" | "review";

interface RebalanceStepperProps {
  currentPhase: RebalancePhase;
  hasSellOrders: boolean;
}

interface StepDef {
  phase: RebalancePhase;
  label: string;
}

const ALL_STEPS: StepDef[] = [
  { phase: "sell", label: "매도" },
  { phase: "buy", label: "매수" },
  { phase: "review", label: "완료 확인" },
];

export function RebalanceStepper({
  currentPhase,
  hasSellOrders,
}: RebalanceStepperProps) {
  const steps = hasSellOrders ? ALL_STEPS : ALL_STEPS.filter((s) => s.phase !== "sell");
  const currentIndex = steps.findIndex((s) => s.phase === currentPhase);

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.phase} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex items-center gap-2">
              <m.div
                className={cn(
                  "flex items-center justify-center size-7 rounded-full text-xs font-semibold shrink-0 transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
                animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </m.div>
              <span
                className={cn(
                  "text-sm whitespace-nowrap",
                  isCurrent && "font-semibold text-foreground",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3">
                <div
                  className={cn(
                    "h-0.5 rounded-full transition-colors",
                    i < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
