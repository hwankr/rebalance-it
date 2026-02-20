import { Noto_Sans_KR, Gowun_Batang } from "next/font/google";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const gowunBatang = Gowun_Batang({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gowun-batang",
  display: "swap",
});

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`light min-h-screen bg-background ${notoSansKR.variable} ${gowunBatang.variable}`}
      style={{ colorScheme: "light" }}
    >
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/portfolio">
              <ArrowLeft className="size-4" />
              돌아가기
            </Link>
          </Button>
          <div className="flex-1" />
          <Link href="/notes" className="flex items-center gap-2">
            <Image
              src="/icon-192x192.png"
              alt="Rebalance-it"
              width={24}
              height={24}
              className="size-6"
            />
            <span className="text-sm font-semibold text-foreground">
              투자 노트
            </span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
