"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeProps {
  className?: string;
  children: ReactNode;
}

export function ScrollFade({ className, children }: ScrollFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn("overflow-x-auto scrollbar-hide", className)}
      >
        {children}
      </div>
      {/* Left fade */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
          showLeft ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Right fade */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
          showRight ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
