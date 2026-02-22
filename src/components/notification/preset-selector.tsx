"use client";

import { Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  {
    id: "simple",
    emoji: "⚡",
    label: "간단하게",
    desc: "비중이 크게 벗어날 때만 알림",
    config: "기준 5% · 간격 7일",
  },
  {
    id: "thorough",
    emoji: "🔍",
    label: "꼼꼼하게",
    desc: "작은 변동도 놓치지 않게",
    config: "기준 3% · 간격 3일",
  },
  {
    id: "custom",
    emoji: "🛠",
    label: "직접 설정",
    desc: "모든 항목을 내가 결정",
    config: "고급 설정 모두 표시",
  },
] as const;

interface PresetSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  onDismiss: () => void;
  isPending?: boolean;
}

export function PresetSelector({ selected, onSelect, onDismiss, isPending }: PresetSelectorProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 p-5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-bold">빠른 시작</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        알림 스타일을 선택하면 추천 설정이 자동 적용돼요.
        <br />나중에 언제든 바꿀 수 있어요.
      </p>
      <div className="flex flex-col gap-2.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            disabled={isPending}
            className={cn(
              "flex items-center gap-3.5 p-3.5 rounded-lg border text-left transition-all",
              selected === p.id
                ? "border-primary bg-primary/5"
                : "border-border/50 bg-card hover:bg-muted/50",
            )}
          >
            <span className="text-2xl flex-shrink-0">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
              <div className="text-[11px] text-muted-foreground/60 mt-1 font-mono">
                {p.config}
              </div>
            </div>
            {selected === p.id && (
              <div className="size-5.5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="size-3.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
