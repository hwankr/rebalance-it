"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setIsSubmitting(false);
        return;
      }
      router.push("/portfolio");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setIsSubmitting(false);
        return;
      }
      setSuccess("확인 이메일을 발송했습니다. 이메일을 확인해주세요.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-mesh">
      {/* Animated floating orbs */}
      <div
        className="orb w-72 h-72 bg-[var(--gradient-start)] opacity-30 top-[10%] left-[15%]"
      />
      <div
        className="orb w-96 h-96 bg-[var(--gradient-end)] opacity-20 top-[50%] right-[10%]"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="orb w-64 h-64 opacity-25 bottom-[10%] left-[40%]"
        style={{
          animationDelay: "4s",
          background: "oklch(0.60 0.20 300)",
        }}
      />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 bg-dot-grid opacity-30" />

      {/* Glass auth card */}
      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="glass-card">
          <CardHeader className="text-center space-y-2">
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CardTitle className="text-4xl font-bold text-gradient">
                Rebalance-it
              </CardTitle>
            </m.div>
            <CardDescription className="text-base">
              {mode === "login"
                ? "스마트한 포트폴리오 리밸런싱"
                : "새 계정을 만들어 시작하세요"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex flex-col gap-2"
              >
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </m.div>
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-col gap-2"
              >
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="최소 6자"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11"
                />
              </m.div>

              {error && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </m.div>
              )}

              {success && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success"
                >
                  {success}
                </m.div>
              )}

              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  {mode === "login" ? "로그인" : "회원가입"}
                </Button>
              </m.div>
            </form>

            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-6 text-center text-sm"
            >
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                  setSuccess(null);
                }}
              >
                {mode === "login"
                  ? "계정이 없으신가요? 회원가입"
                  : "이미 계정이 있으신가요? 로그인"}
              </button>
            </m.div>
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}
