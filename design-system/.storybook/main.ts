import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

/*
 * 앱(client)은 Next 가 함께 넣어 둔 React canary 로 돈다. 탭 밑줄이 옮겨 가는 <ViewTransition> 은 canary 에만 있어,
 * Storybook 도 같은 React 로 그려야 앱과 같게 보인다. 이 패키지의 테스트는 안정판 React 를 그대로 쓴다.
 * canary react-dom 이 안에서 next/dist/compiled/react 를 직접 부르므로, react 도 그 파일로 이어야 React 가 한 벌이다.
 * Next 버전을 올리면 Storybook 도 함께 띄워 확인한다.
 */
const nextDir = dirname(
  realpathSync(
    createRequire(import.meta.url).resolve("next/package.json", {
      paths: [join(import.meta.dirname, "../../client")],
    }),
  ),
);
const compiled = (name: string) => join(nextDir, "dist/compiled", name);
// Next 는 react-dom/test-utils 를 넣지 않는다. Storybook 은 React.act 가 없을 때만 이것을 부르는데 canary 에는 act 가 있다.
// 경로만 풀리도록 이 패키지의 안정판 파일로 잇는다. 이 파일은 react 의 act 를 다시 내보내므로 위의 canary 를 쓴다.
const testUtils = createRequire(import.meta.url).resolve("react-dom/test-utils");

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // 기초(토큰) 문서는 docs/, 부품 문서와 스토리는 부품 옆 src/ 에 둔다.
  stories: ["../docs/**/*.mdx", "../src/**/*.mdx", "../src/**/*.stories.tsx"],
  // MDX 문서 페이지를 쓴다. 문서를 자동으로 만드는 autodocs 는 켜지 않는다(부품 문서는 MDX 로 직접 쓴다).
  // 스토리를 Vitest 테스트로 돌리고(addon-vitest), 접근성을 axe 로 검사한다(addon-a11y).
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest", "@storybook/addon-a11y"],
  /*
   * props 표는 react-docgen-typescript 로 만든다. 기본 docgen 은 cva 로 만든 변형 타입을 풀지 못해 variant 가
   * NonNullable 로만 보인다. HTML 기본 속성(node_modules 의 타입)은 빼서 부품이 정한 props 만 남긴다.
   */
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => !prop.parent || !prop.parent.fileName.includes("node_modules"),
    },
  },
  // 견본에 쓰는 그림(피부 타입, 제품 사진)은 앱의 정적 파일을 그대로 빌려 쓴다.
  staticDirs: ["../../client/public"],
  // Storybook 새 버전 알림은 팀 문서에 필요 없어 끈다.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // 사이드바의 Storybook 시작 안내(Get started)는 팀 문서에 필요 없어 끈다.
  features: { sidebarOnboardingChecklist: false },
  // 패키지에는 vite.config 가 없다. 앱처럼 패키지의 theme.css 만 가져와 Tailwind 로 만들므로,
  // 부품이 쓰는 클래스가 패키지 안에서 만들어지는지도 함께 확인된다.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: [
          { find: /^react$/, replacement: compiled("react/index.js") },
          { find: /^react\/(.+)$/, replacement: `${compiled("react")}/$1` },
          { find: /^react-dom\/test-utils$/, replacement: testUtils },
          { find: /^react-dom$/, replacement: compiled("react-dom/index.js") },
          { find: /^react-dom\/(.+)$/, replacement: `${compiled("react-dom")}/$1` },
        ],
      },
    }),
};

export default config;
