import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공유 API 스키마가 client/ 밖의 common/ 에 있다. 추적 기준을 저장소 루트로
  // 올리지 않으면 빌드 산출물에서 common 이 빠진다.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
