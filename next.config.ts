import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 보안 헤더
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // 페이지 구조 변경 리다이렉트
  async redirects() {
    return [
      {
        source: "/manual-portfolio",
        destination: "/portfolio",
        permanent: true,
      },
      {
        source: "/presets",
        destination: "/rebalance",
        permanent: true,
      },
    ];
  },

  // 이미지 최적화
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // 외부 패키지
  serverExternalPackages: [],
};

export default nextConfig;
