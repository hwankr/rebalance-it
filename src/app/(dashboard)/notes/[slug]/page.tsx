import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { guides, getGuideBySlug } from "@/lib/guides";

const guideComponents: Record<
  string,
  () => Promise<{ default: React.ComponentType }>
> = {
  "stock-tax-2026": () => import("@/components/guides/stock-tax-2026"),
  "rebalancing-guide": () => import("@/components/guides/rebalancing-guide"),
};

export function generateStaticParams() {
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return { title: "노트를 찾을 수 없습니다" };
  }

  return {
    title: `${guide.title} | Rebalance-it 투자 노트`,
    description: guide.description,
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      locale: "ko_KR",
      publishedTime: guide.publishedAt,
    },
  };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  const loader = guideComponents[slug];

  if (!guide || !loader) {
    notFound();
  }

  const { default: GuideContent } = await loader();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          돌아가기
        </Link>
      </div>
      <GuideContent />
    </div>
  );
}
