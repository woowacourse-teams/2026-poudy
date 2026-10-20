import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./preview.css";

import type { Preview } from "@storybook/react-vite";

import { IconSprite } from "../src/icon";
import { ToastProvider } from "../src/toast";

const preview: Preview = {
  parameters: {
    htmlLang: "ko",
    // 화면 폭과 여백은 아래 decorator 가 앱과 같게 정한다.
    layout: "fullscreen",
    options: {
      storySort: {
        order: ["버튼", "입력", "선택", "칩과 태그", "탭과 펼침", "시트", "피드백", "화면 골격"],
      },
    },
  },
  // 앱(client/app/layout.tsx)처럼 아이콘 그림 묶음과 토스트 자리를 한 번 두고, 앱 화면 폭으로 그린다.
  decorators: [
    (Story) => (
      <ToastProvider>
        <IconSprite />
        <main className="mx-auto flex max-w-md flex-col gap-4 bg-background px-gutter py-6 font-sans">
          <Story />
        </main>
      </ToastProvider>
    ),
  ],
};

export default preview;
