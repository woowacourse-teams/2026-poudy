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
    // VM 컨텍스트는 끝난 파일의 메모리를 돌려주지 않아 파일마다 35MB 안팎이 쌓인다. 기본값은 워커마다
    // 전체 메모리를 워커 수로 나눈 만큼까지 쌓아 두므로, 16GB 노트북에서 테스트 한 번에 7GB 넘게 쓴다.
    // 이 값을 넘긴 워커는 다음 파일 전에 새로 띄워, 같은 조건에서 3GB 아래로 유지한다.
    vmMemoryLimit: "300MB",
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
