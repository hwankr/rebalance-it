"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import { useState, type ReactNode } from "react";
import { GuestModeProvider } from "@/contexts/guest-mode-context";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={queryClient}>
            <GuestModeProvider>
              {children}
            </GuestModeProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
