"use client";

import { Disclosure, DisclosureContent, DisclosureIcon, DisclosureTrigger } from "@poudy/design-system/disclosure";

type ScheduledTermsDisclosureProps = {
  /** 펼치는 줄의 글자. 버튼의 이름이 된다. */
  readonly label: string;
  /** 펼친 내용. 서버에서 그린 약관을 그대로 받는다. */
  readonly children: React.ReactNode;
};

/**
 * 이용약관의 시행 예정 약관을 접어 두는 상자. 줄 모양은 APP · 질문 행(15 · 600, 꺾쇠 20)을 따르고,
 * 테두리 상자는 옮기기 전 모양을 그대로 둔다. 접힌 동안에도 내용은 hidden 으로 문서에 남아
 * 페이지 안 찾기와 검색엔진이 읽는다.
 *
 * DisclosureTrigger 는 넘겨받은 버튼을 복제해 속성을 붙이므로, 버튼은 client 에서 만들어야 한다.
 * 서버 컴포넌트가 넘긴 요소는 복제할 수 있는 요소로 오지 않는다.
 */
export function ScheduledTermsDisclosure({ label, children }: ScheduledTermsDisclosureProps) {
  return (
    <div className="rounded-lg border border-border">
      <Disclosure>
        <DisclosureTrigger>
          <button
            type="button"
            className="fb-surface flex w-full items-center gap-3 rounded-lg px-3 py-4 data-[state=open]:rounded-b-none text-left text-title font-semibold text-text-primary"
          >
            <span className="min-w-0 flex-1">{label}</span>
            {/* 꺾쇠는 놓인 자리의 글자색을 따른다. 질문 행처럼 보조색으로 둔다. */}
            <span className="flex text-text-secondary">
              <DisclosureIcon />
            </span>
          </button>
        </DisclosureTrigger>
        <DisclosureContent>
          <div className="flex flex-col gap-6 border-t border-border px-3 pt-4 pb-3">{children}</div>
        </DisclosureContent>
      </Disclosure>
    </div>
  );
}
