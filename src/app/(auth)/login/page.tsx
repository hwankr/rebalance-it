"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Rebalance-it</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "계정에 로그인하세요"
              : "새 계정을 만드세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="최소 6자"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                {success}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
