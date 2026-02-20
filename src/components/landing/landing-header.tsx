"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LandingHeaderProps {
  onGuestStart: () => void;
}

export function LandingHeader({ onGuestStart }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <m.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-header border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon-192x192.png"
            alt="Rebalance-it"
            width={32}
            height={32}
            className="size-8"
          />
          <span className="text-lg font-bold text-foreground">
            Rebalance-it
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block px-3 py-2"
          >
            요금제
          </Link>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">로그인</Link>
          </Button>
          <Button variant="gradient" size="sm" onClick={onGuestStart}>
            시작하기
          </Button>
        </div>
      </nav>
    </m.header>
  );
}
