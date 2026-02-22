import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/portfolio";

  // Open redirect protection: only allow relative paths
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/portfolio";

  // OAuth error from provider (e.g., user cancelled consent)
  if (error) {
    const errorParam = error === "access_denied" ? "auth_cancelled" : "auth_failed";
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, request.url));
  }

  if (code) {
    const redirectUrl = new URL(safePath, request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Inline Supabase client that writes cookies directly to the redirect response.
    // createServerSupabaseClient() uses cookies() from next/headers, which does not
    // propagate cookies to a NextResponse.redirect() in Route Handlers.
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}
