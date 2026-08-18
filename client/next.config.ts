import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 공유 API 스키마가 client/ 밖의 common/ 에 있다. 추적 기준을 저장소 루트로
  // 올리지 않으면 빌드 산출물에서 common 이 빠진다.
  outputFileTracingRoot: path.join(__dirname, ".."),

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
