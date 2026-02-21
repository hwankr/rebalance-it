"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("border-t border-border bg-background", className)}>
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
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
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              스마트한 포트폴리오 리밸런싱
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Rebalance-it. All rights
              reserved.
            </p>
          </div>

          {/* Service Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              서비스
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/portfolio"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  내 포트폴리오
                </Link>
              </li>
              <li>
                <Link
                  href="/rebalance"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  리밸런싱
                </Link>
              </li>
              <li>
                <Link
                  href="/notes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  투자 노트
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  요금제
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              법적 고지
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              고객 지원
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("fabronjeon@naver.com");
                    toast.success("이메일이 복사되었습니다.");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  fabronjeon@naver.com
                </button>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  사업자정보 준비 중
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            주식 시세 데이터는 Yahoo Finance에서 제공되며, 투자 판단의 근거로
            사용할 수 없습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
