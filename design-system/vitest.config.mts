import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/*
 * 스토리를 테스트로 돌린다(#858). 스토리마다 그려지는지, play 함수의 상호작용이 맞는지, 접근성 위반이 있는지 본다.
 * 브라우저 모드(Playwright Chromium)에서 돈다. 이 패키지의 단위 테스트(src/*.test.tsx)는 client 의 vitest 가 돌린다.
 * Storybook 의 미리 보기 설정(decorator, parameters)과 애드온(a11y)은 addon-vitest 가 알아서 입힌다(10.3 부터).
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir: fileURLToPath(new URL(".storybook", import.meta.url)) })],
        test: {
          name: "storybook",
          // 토스트 견본은 실제 시계로 4초를 기다린다.
          testTimeout: 15_000,
          browser: {
            enabled: true,
            // 설치된 Google Chrome 으로 돌린다. Playwright 의 Chromium 을 따로 받지 않는다.
            // CI 의 ubuntu-latest 에는 Chrome 이 이미 있다(Lighthouse 도 이 Chrome 을 쓴다).
            provider: playwright({ launchOptions: { channel: "chrome" } }),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
