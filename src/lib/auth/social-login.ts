import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

export type SocialProvider = "google" | "kakao";

interface SocialLoginConfig {
  provider: Provider;
  label: string;
  bgColor: string;
  textColor: string;
  hoverBgColor: string;
  darkBgColor?: string;
  darkTextColor?: string;
  darkHoverBgColor?: string;
  borderColor?: string;
}

export const SOCIAL_PROVIDERS: Record<SocialProvider, SocialLoginConfig> = {
  google: {
    provider: "google" as Provider,
    label: "Google로 계속하기",
    bgColor: "bg-white",
    textColor: "text-gray-700",
    hoverBgColor: "hover:bg-gray-50",
    darkBgColor: "dark:bg-gray-800",
    darkTextColor: "dark:text-gray-200",
    darkHoverBgColor: "dark:hover:bg-gray-700",
    borderColor: "border border-gray-300 dark:border-gray-600",
  },
  kakao: {
    provider: "kakao" as Provider,
    label: "카카오로 계속하기",
    bgColor: "bg-[#FEE500]",
    textColor: "text-[#191919]",
    hoverBgColor: "hover:bg-[#FDD835]",
  },
};

export async function signInWithSocial(
  provider: SocialProvider
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const config = SOCIAL_PROVIDERS[provider];

  const { error } = await supabase.auth.signInWithOAuth({
    provider: config.provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
    },
  });

  return { error: error ? new Error(error.message) : null };
}
