import path from "node:path";

import type { NextConfig } from "next";

/*
 * EC2 는 standalone 산출물을 그대로 띄우지만, Vercel 은 자체 산출물을 만든다.
 * 두 곳의 방식이 달라 배포 대상에 따라 갈라 준다.
 */
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercel
    ? {}
    : {
        output: "standalone" as const,
        // 공유 API 스키마가 client/ 밖의 common/ 에 있다. 추적 기준을 저장소 루트로
        // 올리지 않으면 빌드 산출물에서 common 이 빠진다.
        outputFileTracingRoot: path.join(__dirname, ".."),
      }),

  // 공유 API 스키마(common/api.zod.ts)는 client/ 밖에 있다. root 를 저장소 루트로 올리지 않으면
  // Turbopack 이 client/ 밖을 읽지 못한다. EC2 빌드는 outputFileTracingRoot 가 이 역할을 대신
  // 했지만, Vercel 빌드에는 그 설정이 없어 스키마를 불러오지 못했다.
  // 저장소 루트에는 node_modules 가 없으므로, common 에서 부르는 zod 는 client 의 것을 가리키게 한다.
  // common 을 워크스페이스 패키지로 만들어 zod 를 의존성으로 두면 이 별칭은 지운다.
  turbopack: {
    root: path.join(__dirname, ".."),
    resolveAlias: { zod: "./node_modules/zod" },
  },

  // 제품 이미지는 S3 에서 온다. 허용 목록에 없는 주소는 next/image 가 런타임에 막는다.
  images: {
    // EC2의 이미지 변환 부담과 Vercel의 최적화 사용량을 줄이기 위해 변환을 건너뛴다.
    unoptimized: true,
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
      // SDK 와 설정은 자산 도메인에서 받는다.
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      // 이벤트는 수집 도메인으로 보낸다.
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },

  async headers() {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "production") return [];

    return [
      "/",
      "/brands",
      "/brands/:brandId",
      "/categories",
      "/categories/:categoryId",
      "/products/:productId",
      "/ingredients/:ingredientId",
      "/curations/:curationId",
    ].map((source) => ({
      source,
      headers: [{ key: "Link", value: '</llms.txt>; rel="describedby"' }],
    }));
  },

  // 이벤트 수집 주소가 /i/v0/e/ 처럼 슬래시로 끝난다.
  // 기본 동작대로 슬래시를 떼면 요청이 리다이렉트되어 실패한다.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
