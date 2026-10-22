import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./preview.css";

import type { Preview } from "@storybook/react-vite";

import { IconSprite } from "../src/icon";
import { ToastProvider } from "../src/toast";

const preview: Preview = {
  parameters: {
    htmlLang: "ko",
    // 접근성 위반은 처음에는 경고로만 알린다(#858). 정리를 마친 뒤 "error" 로 올려 CI 를 막는다.
    a11y: { test: "todo" },
    // 화면 폭과 여백은 아래 decorator 가 앱과 같게 정한다.
    layout: "fullscreen",
    options: {
      storySort: {
        order: [
          "기초",
          ["개요", "색", "글자", "모양과 움직임"],
          "버튼",
          "입력",
          "선택",
          "칩과 태그",
          "탭과 펼침",
          "시트",
          "피드백",
          "화면 골격",
        ],
      },
    },
  },
  /*
   * 앱(client/app/layout.tsx)처럼 아이콘 그림 묶음과 토스트 자리를 한 번 두고, 앱 화면 폭으로 그린다.
   * 화면 골격(Screen)처럼 화면 전체를 그리는 스토리는 parameters.frame 을 "screen" 으로 두어 본문 여백 없이 그린다.
   */
  decorators: [
    (Story, { parameters }) => (
      <ToastProvider>
        <IconSprite />
        {parameters.frame === "screen" ? (
          <div className="mx-auto max-w-md bg-background font-sans">
            <Story />
          </div>
        ) : (
          <main className="mx-auto flex max-w-md flex-col gap-4 bg-background px-gutter py-6 font-sans">
            <Story />
          </main>
        )}
      </ToastProvider>
    ),
  ],
};

export default preview;
