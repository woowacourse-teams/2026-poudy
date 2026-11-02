import path from "node:path";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// HTTP 목을 검증하는 mock-* 파일은 기존 MSW 초기화를 유지한다.
const domainTests = "lib/domain/**/!(mock-*).test.ts";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    // 파일마다 jsdom 과 모듈을 새로 만드는 기본 풀보다 VM 컨텍스트를 다시 쓰는 풀이 두 배쯤 빠르다.
    // VM 컨텍스트에서는 window.location 을 바꿀 수 없어, 주소 이동은 lib/navigation/browser-location 을 목으로 바꾼다.
    pool: "vmThreads",
    projects: [
      {
        extends: true,
        test: {
          name: "domain",
          include: [domainTests],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "application",
          include: [
            "app/**/*.test.tsx",
            "components/**/*.test.tsx",
            "lib/**/*.test.ts",
            "../design-system/src/**/*.test.{ts,tsx}",
          ],
          exclude: [...configDefaults.exclude, domainTests],
          setupFiles: ["./vitest.vm-globals.ts", "./vitest.setup.ts"],
          environment: "node",
        },
      },
    ],
  },
});
