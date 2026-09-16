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

  // 제품 이미지는 S3 에서 온다. 허용 목록에 없는 주소는 next/image 가 런타임에 막는다.
  images: {
    /*
     * Vercel 에 올릴 때는 최적화를 건너뛴다.
     *
     * Vercel 의 이미지 최적화는 계정 단위로 양이 정해져 있다. preview 는 Pull Request 마다
     * 새로 배포되어 같은 이미지를 다시 최적화하므로 그 양을 빠르게 써 버리고, 다 쓰고 나면
     * `/_next/image` 가 402 를 내려보내 화면의 그림이 전부 깨진다. 확인해야 할 것은 화면의
     * 구성이지 이미지가 얼마나 줄어드는지가 아니므로, 원본을 그대로 내려보낸다.
     *
     * 운영은 EC2 에서 standalone 으로 띄워 Vercel 의 양을 쓰지 않으므로 그대로 최적화한다.
     * 로컬 개발도 마찬가지라 운영과 같은 조건에서 화면을 본다.
     */
    unoptimized: isVercel,
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

  // 이벤트 수집 주소가 /i/v0/e/ 처럼 슬래시로 끝난다.
  // 기본 동작대로 슬래시를 떼면 요청이 리다이렉트되어 실패한다.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
