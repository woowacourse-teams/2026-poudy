import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "@poudy/api": path.resolve(import.meta.dirname, "../common"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    // 순수 함수는 node 로 빠르게 돌린다. 브라우저 API 가 필요한 파일은
    // 파일 맨 위에 `@vitest-environment jsdom` 주석을 달아 따로 지정한다.
    environment: "node",
  },
});
