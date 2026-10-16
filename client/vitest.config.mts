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
          setupFiles: ["./vitest.setup.ts"],
          environment: "node",
        },
      },
    ],
  },
});
