import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./preview.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "../src/button";
import { IconButton } from "../src/icon-button";
import { Icon } from "./icons";
import { ChipSamples } from "./chip-samples";
import { ChoiceSamples } from "./choice-samples";
import { InputSamples } from "./input-samples";
import { Section } from "./section";
import { SheetSamples } from "./sheet-samples";
import { TabSamples } from "./tab-samples";

/** 디자인 시스템 부품을 한 화면에 늘어놓은 견본이다. 폭은 앱 화면과 같다. */
function Preview() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 bg-background px-gutter py-6 font-sans">
      <h1 className="text-screen font-bold text-text-primary">디자인 시스템 미리보기</h1>

      <Section title="Button · 크기 lg (화면 아래 고정 CTA)">
        <Button size="lg">다음</Button>
        <Button size="lg" variant="destructive">
          탈퇴하기
        </Button>
        <Button size="lg" aria-disabled="true" aria-describedby="sample-reason">
          다음
        </Button>
        <p id="sample-reason" className="text-caption text-text-secondary">
          필수 항목을 모두 골라 주세요.
        </p>
      </Section>

      <Section title="Button · 크기 md (본문·시트)">
        <Button>제품 보기</Button>
        <Button variant="secondary">초기화</Button>
        <Button variant="destructive">삭제</Button>
        <Button trailingIcon={<Icon name="chevron-right" size={16} />}>더 보기</Button>
        <Button variant="secondary" leadingIcon={<Icon name="share" size={16} />}>
          공유하기
        </Button>
        <Button disabled>저장</Button>
        <Button busy>저장하는 중</Button>
      </Section>

      <Section title="Button · outline (목록 행 오른쪽 보조 행동)">
        <div className="flex gap-2">
          <Button variant="outline">추가</Button>
          <Button variant="outline">평가하기</Button>
        </div>
      </Section>

      <Section title="Button · text (행 전체가 누르는 글자 버튼)">
        <Button variant="text" trailingIcon={<Icon name="chevron-right" size={16} className="text-text-secondary" />}>
          문의하기
        </Button>
      </Section>

      <Section title="IconButton">
        <div className="flex items-center gap-4">
          <IconButton label="닫기" icon={<Icon name="x" size={24} strokeWidth={2} />} />
          <IconButton label="공유" icon={<Icon name="share" size={24} strokeWidth={2} />} />
          <div className="rounded-lg bg-surface-inverse p-2">
            <IconButton variant="overlay" label="다음 사진" icon={<Icon name="chevron-right" size={20} />} />
          </div>
          <div className="relative size-18 rounded-sm bg-surface">
            <IconButton
              variant="thumbnail-remove"
              label="사진 삭제"
              icon={<Icon name="x" size={14} strokeWidth={2} />}
              className="absolute -top-2.5 -right-2.5"
            />
          </div>
        </div>
      </Section>

      <InputSamples />
      <ChoiceSamples />
      <ChipSamples />
      <TabSamples />
      <SheetSamples />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
