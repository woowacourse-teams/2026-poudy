import path from "node:path";

import type { NextConfig } from "next";

/*
 * EC2 는 standalone 산출물을 그대로 띄우지만, Vercel 은 자체 산출물을 만든다.
 * 두 곳의 방식이 달라 배포 대상에 따라 갈라 준다.
 */
const isVercel = Boolean(process.env.VERCEL);

// 운영은 Nginx 가 웹과 API 를 같은 도메인으로 묶지만, staging 은 웹이 Vercel, API 가 EC2 로 갈라진다.
// 앱은 웹 주소 하나로 /api 를 부르므로, 두 주소가 다른 환경에서만 그 요청을 API 로 넘긴다.
const originOf = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const siteOrigin = originOf(process.env.NEXT_PUBLIC_SITE_URL);
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_BASE_URL);
const apiProxyOrigin = apiOrigin !== siteOrigin ? apiOrigin : null;

const nextConfig: NextConfig = {
  ...(isVercel
    ? {}
    : {
        output: "standalone" as const,
        // 공유 API 스키마가 client/ 밖의 common/ 에 있다. 추적 기준을 저장소 루트로
        // 올리지 않으면 빌드 산출물에서 common 이 빠진다.
        outputFileTracingRoot: path.join(__dirname, ".."),
      }),

  // 제품 이미지는 S3 에서 온다. 허용 목록에 없는 주소는 next/image 가 런타임에 막는다.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "techcourse-project-2026.s3.ap-northeast-2.amazonaws.com",
        pathname: "/poudy/**",
      },
    ],
  },

  // PostHog 로 바로 보내면 광고 차단기가 요청을 막아 이벤트가 유실된다.
  // 같은 출처의 /ingest 로 받아 넘기면 차단 목록에 걸리지 않는다.
  async rewrites() {
    return [
      // destination 은 빌드 시점에 문자열로 굳는다. 주소가 없으면 규칙 자체를 만들지 않는다.
      ...(apiProxyOrigin ? [{ source: "/api/:path*", destination: `${apiProxyOrigin}/api/:path*` }] : []),

      // SDK 와 설정은 자산 도메인에서 받는다.
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      // 이벤트는 수집 도메인으로 보낸다.
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },

  // 이벤트 수집 주소가 /i/v0/e/ 처럼 슬래시로 끝난다.
  // 기본 동작대로 슬래시를 떼면 요청이 리다이렉트되어 실패한다.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
