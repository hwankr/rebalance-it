"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { m } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useGuestMode } from "@/contexts/guest-mode-context";
import {
  signInWithSocial,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "@/lib/auth/social-login";
import { GoogleIcon } from "@/components/icons/google-icon";
import { KakaoIcon } from "@/components/icons/kakao-icon";
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
import Image from "next/image";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "인증에 실패했습니다. 다시 시도해주세요.",
  auth_cancelled: "로그인이 취소되었습니다.",
};

const SOCIAL_ICONS: Record<SocialProvider, React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  kakao: KakaoIcon,
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enterGuestMode, exitGuestMode } = useGuestMode();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam]);
    }
  }, [searchParams]);

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
      try {
        exitGuestMode();
        router.refresh();
        router.push("/portfolio");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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

  async function handleSocialLogin(provider: SocialProvider) {
    setSocialLoading(provider);
    setError(null);
    const { error } = await signInWithSocial(provider);
    if (error) {
      setError("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
      setSocialLoading(null);
    }
  }

  const isAnyLoading = isSubmitting || socialLoading !== null;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="border shadow-sm">
          <CardHeader className="text-center space-y-2">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Image src="/icon-512x512.png" alt="Rebalance-it" width={56} height={56} className="mx-auto size-14" />
              <CardTitle className="text-4xl font-bold text-foreground">
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
            {/* Social Login Buttons */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-col gap-3 mb-6"
            >
              {(Object.keys(SOCIAL_PROVIDERS) as SocialProvider[]).map(
                (providerKey) => {
                  const config = SOCIAL_PROVIDERS[providerKey];
                  const Icon = SOCIAL_ICONS[providerKey];
                  const isLoading = socialLoading === providerKey;

                  return (
                    <button
                      key={providerKey}
                      type="button"
                      disabled={isAnyLoading}
                      onClick={() => handleSocialLogin(providerKey)}
                      className={`flex w-full items-center justify-center gap-3 rounded-md h-11 px-4 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.bgColor} ${config.textColor} ${config.hoverBgColor} ${config.darkBgColor ?? ""} ${config.darkTextColor ?? ""} ${config.darkHoverBgColor ?? ""} ${config.borderColor ?? ""}`}
                    >
                      {isLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                      {config.label}
                    </button>
                  );
                }
              )}
            </m.div>

            {/* Divider */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="relative flex items-center justify-center mb-6"
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <span className="relative bg-card px-3 text-xs text-muted-foreground">
                또는 이메일로 계속
              </span>
            </m.div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
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
                  disabled={isAnyLoading}
                />
              </m.div>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
                  disabled={isAnyLoading}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-11 text-base"
                  disabled={isAnyLoading}
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

            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="space-y-2"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <span className="relative bg-card px-3 text-xs text-muted-foreground">
                  또는
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                disabled={isAnyLoading}
                onClick={() => {
                  enterGuestMode();
                  router.push("/portfolio");
                }}
              >
                비회원으로 시작
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                데이터는 브라우저에만 저장됩니다
              </p>
            </m.div>
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
