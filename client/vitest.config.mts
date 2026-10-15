import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    include: [
      "app/**/*.test.tsx",
      "components/**/*.test.tsx",
      "lib/**/*.test.ts",
      // 디자인 시스템 패키지의 부품 테스트도 여기서 돌린다. 패키지에는 React 테스트 환경을 따로 두지 않는다.
      "../design-system/src/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./vitest.setup.ts"],
    // 순수 함수는 node 로 빠르게 돌린다. 브라우저 API 가 필요한 파일은
    // 파일 맨 위에 `@vitest-environment jsdom` 주석을 달아 따로 지정한다.
    environment: "node",
  },
});
