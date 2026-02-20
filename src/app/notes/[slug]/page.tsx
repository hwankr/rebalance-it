import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guides, getGuideBySlug } from "@/lib/guides";

const guideComponents: Record<
  string,
  () => Promise<{ default: React.ComponentType }>
> = {
  "stock-tax-2026": () => import("@/components/guides/stock-tax-2026"),
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
    <main>
      <GuideContent />
    </main>
  );
}
