export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
  publishedAt: string;
  icon: string;
}

export const guides: Guide[] = [
  {
    slug: "stock-tax-2026",
    title: "한국 주식 세금 완전 가이드 2026",
    description:
      "국내 주식부터 해외 주식까지 — 투자할 때 꼭 알아야 할 세금의 종류와 세율을 한 곳에 정리했습니다.",
    category: "세금",
    categoryColor: "bg-amber-100 text-amber-800",
    publishedAt: "2026-02-20",
    icon: "💰",
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
