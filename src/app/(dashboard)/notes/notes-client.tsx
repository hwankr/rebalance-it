"use client";

import Link from "next/link";
import { type Guide } from "@/lib/guides";
import { m } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function NotesClient({ guides }: { guides: Guide[] }) {
  return (
    <>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl text-foreground">
          투자 노트
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto font-medium">
          투자와 포트폴리오 관리에 도움이 되는 핵심 지식 모음
        </p>
      </m.div>

      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {guides.map((guide) => (
          <m.div key={guide.slug} variants={itemVariants}>
            <Link
              href={`/notes/${guide.slug}`}
              className="group flex flex-col h-full rounded-3xl border border-border/50 bg-card p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex flex-col flex-1">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/80 text-3xl shadow-sm transition-transform group-hover:scale-110 duration-300">
                    {guide.icon}
                  </div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${guide.categoryColor} bg-opacity-20 backdrop-blur-md`}
                  >
                    {guide.category}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium line-clamp-3">
                    {guide.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-muted-foreground">
                    {guide.publishedAt}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
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
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </m.div>
        ))}

        {guides.length === 1 && (
          <m.div variants={itemVariants}>
            <div className="group flex flex-col h-full rounded-3xl border-2 border-dashed border-border/50 p-6 md:p-8 justify-center items-center text-center transition-all duration-300 hover:border-border hover:bg-secondary/20">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/50 text-2xl text-muted-foreground">
                ⏳
              </div>
              <h3 className="mb-2 text-lg font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground/70 max-w-[200px] leading-relaxed">
                더 유익한 투자 노트가<br />곧 추가될 예정입니다
              </p>
            </div>
          </m.div>
        )}
      </m.div>
    </>
  );
}
