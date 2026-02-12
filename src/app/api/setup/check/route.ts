import { NextResponse } from "next/server";

interface CheckResult {
  name: string;
  configured: boolean;
  required: boolean;
}

export async function GET() {
  const checks: CheckResult[] = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      configured:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"),
      required: true,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      configured:
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder"),
      required: true,
    },
    {
      name: "KIWOOM_APP_KEY",
      configured: !!process.env.KIWOOM_APP_KEY,
      required: true,
    },
    {
      name: "KIWOOM_APP_SECRET",
      configured: !!process.env.KIWOOM_APP_SECRET,
      required: true,
    },
    {
      name: "KIWOOM_PROXY_URL",
      configured: !!process.env.KIWOOM_PROXY_URL,
      required: false,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: false,
    },
  ];

  const allRequired = checks.filter((c) => c.required).every((c) => c.configured);

  return NextResponse.json({
    ready: allRequired,
    checks,
    environment: process.env.NODE_ENV,
  });
}
