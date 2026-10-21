"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { ScreenBody } from "@poudy/design-system/screen";

import type { SummaryRow } from "./use-submission";

/*
 * 체크만 따로 그린다. 공용 Icon 은 스프라이트를 <use> 로 가리켜 안쪽 path 에 pathLength 를 줄 수 없다.
 * 획이 그려지는 움직임은 이 화면에만 쓴다.
 */
function DrawnCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={38}
      height={38}
      /*
       * 시각 보정. 체크는 아래로 뻗은 획이 짧고 위로 올라가는 획이 길어, 자를 대고 가운데에 두면 위로 떠 보인다.
       * 1 내려 눈에 맞춘다.
       */
      className="translate-y-px"
    >
      {/*
       * Tabler 의 체크를 왼쪽 아래에서 시작하게 그린다. 손으로 체크를 그을 때와 같은 차례다.
       * 길이를 1 로 맞춰 두어 좌표와 무관하게 끊는 셈이 맞는다.
       */}
      <path d="M5 12l5 5l10 -10" pathLength={1} strokeDasharray={1} className="animate-check-draw" />
    </svg>
  );
}

/** 렌더마다 다시 불리지 않도록 함수를 밖에 둔다. 처음 붙을 때 한 번만 포커스를 옮긴다. */
const focusOnMount = (heading: HTMLHeadingElement | null) => heading?.focus();

/**
 * 접수 완료(명세 S40c). 접수만 됐다는 사실을 전한다. 이 API 들은 답장을 돌려주지 않으므로 반영 시점을 약속하지 않는다.
 * 화면이 바뀌면 제목으로 포커스를 옮겨 낭독기가 결과를 읽게 한다(A11Y '문의 접수 완료').
 */
export function InquiryDone({
  summary,
  onConfirm,
}: {
  readonly summary: readonly SummaryRow[];
  readonly onConfirm: () => void;
}) {
  return (
    <>
      {/* 명세 S40c 는 내용을 본문 가운데에 둔다. 글자를 키워 넘치면 위가 잘리지 않게 safe 로 맞춘다. */}
      <ScreenBody>
        <div className="flex flex-1 flex-col items-center justify-center-safe gap-3 px-gutter py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <DrawnCheck />
          </span>
          <h2 ref={focusOnMount} tabIndex={-1} className="text-hero font-bold text-text-primary outline-none">
            문의를 접수했어요
          </h2>
          <p className="text-body text-text-secondary">보내 주신 내용을 꼼꼼히 확인하고 서비스에 반영할게요.</p>

          {/* 요약 앞은 명세의 '요약 전 여백'만큼 더 띄운다(12 + 6). */}
          <div className="w-full pt-1.5">
            <dl className="flex flex-col rounded-lg bg-surface px-4 py-1">
              {summary.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b border-border py-3 text-left last:border-b-0"
                >
                  <dt className="text-body-sm text-text-secondary">{row.label}</dt>
                  <dd className="text-body font-semibold text-text-primary">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </ScreenBody>

      <BottomActionBar position="screen-end" action={{ label: "확인", onClick: onConfirm }} />
    </>
  );
}
