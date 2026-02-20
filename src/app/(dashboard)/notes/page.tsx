import type { Metadata } from "next";
import { guides } from "@/lib/guides";
import NotesClient from "./notes-client";

export const metadata: Metadata = {
  title: "투자 노트 | Rebalance-it",
  description:
    "투자와 포트폴리오 관리에 도움이 되는 노트 모음. 세금, 리밸런싱, 자산 배분 등 다양한 주제를 다룹니다.",
  openGraph: {
    title: "투자 노트 | Rebalance-it",
    description: "투자와 포트폴리오 관리에 도움이 되는 노트 모음.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl py-4 md:py-8">
      <NotesClient guides={guides} />
    </div>
  );
}
