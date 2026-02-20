import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "투자 노트 | Rebalance-it",
  description:
    "투자와 포트폴리오 관리에 도움이 되는 노트 모음. 세금, 리밸런싱, 자산 배분 등 다양한 주제를 다룹니다.",
  openGraph: {
    title: "투자 노트 | Rebalance-it",
    description:
      "투자와 포트폴리오 관리에 도움이 되는 노트 모음.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function NotesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          투자 노트
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          투자와 포트폴리오 관리에 도움이 되는 노트 모음
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/notes/${guide.slug}`}
            className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="mb-4 text-4xl">{guide.icon}</div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${guide.categoryColor}`}
              >
                {guide.category}
              </span>
              <span className="text-xs text-muted-foreground">
                {guide.publishedAt}
              </span>
            </div>
            <h2 className="mb-2 text-lg font-bold group-hover:text-primary transition-colors">
              {guide.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {guide.description}
            </p>
          </Link>
        ))}
      </div>

      {guides.length === 1 && (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            더 많은 노트가 곧 추가될 예정입니다.
          </p>
        </div>
      )}
    </main>
  );
}
