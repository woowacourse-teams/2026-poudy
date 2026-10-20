import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  // 견본에 쓰는 그림(피부 타입, 제품 사진)은 앱의 정적 파일을 그대로 빌려 쓴다.
  staticDirs: ["../../client/public"],
  core: { disableTelemetry: true },
  // 패키지에는 vite.config 가 없다. 앱처럼 패키지의 theme.css 만 가져와 Tailwind 로 만들므로,
  // 부품이 쓰는 클래스가 패키지 안에서 만들어지는지도 함께 확인된다.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [react(), tailwindcss()] }),
};

export default config;
