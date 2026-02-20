import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              돌아가기
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          개인정보처리방침
        </h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            개인정보처리방침은 준비 중입니다. 빠른 시일 내에 업데이트하겠습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
