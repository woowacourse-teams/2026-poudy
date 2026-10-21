import { cn } from "@poudy/design-system/cn";

/**
 * 주의 성분 상태 아이콘. 경로는 명세(poudy-ui.pen)의 `주의 성분 없음 아이콘` · `주의 성분 있음 아이콘` 을 그대로 옮겼다.
 * 플라스크 폭이 21.8 이라 좌우에 1.1 씩 여백이 있다. 예전 design/v2.pen 의 그림은 24 를 꽉 채워 이름 뒤에서 글자와 맞닿아 보였다.
 *
 * 효과 태그와 달리 색으로도 상태를 가르는 유일한 아이콘이다. 없음은 초록, 있음은 주황으로 그린다.
 */
const NO_CAUTION_PATH =
  "M8.2 0h7.6c0.33 0 0.6 0.27 0.6 0.6v1c0 0.33-0.27 0.6-0.6 0.6h-0.8v3.74a1.2 1.2 0 0 0 0.16 0.6l7.31 12.66a3.2 3.2 0 0 1-2.77 4.8h-15.4a3.2 3.2 0 0 1-2.77-4.8l7.31-12.66a1.2 1.2 0 0 0 0.16-0.6v-3.74h-0.8c-0.33 0-0.6-0.27-0.6-0.6v-1c0-0.33 0.27-0.6 0.6-0.6z m-0.37 15.92l1.95 1.95q0.17 0.17 0.34 0l4.75-4.75a1.1 1.1 0 0 1 1.56 1.56l-5.7 5.7a1.1 1.1 0 0 1-1.56 0l-2.9-2.9a1.1 1.1 0 0 1 1.56-1.56z";

const HAS_CAUTION_PATH =
  "M8.2 0h7.6c0.33 0 0.6 0.27 0.6 0.6v1c0 0.33-0.27 0.6-0.6 0.6h-0.8v3.74a1.2 1.2 0 0 0 0.16 0.6l7.31 12.66a3.2 3.2 0 0 1-2.77 4.8h-15.4a3.2 3.2 0 0 1-2.77-4.8l7.31-12.66a1.2 1.2 0 0 0 0.16-0.6v-3.74h-0.8c-0.33 0-0.6-0.27-0.6-0.6v-1c0-0.33 0.27-0.6 0.6-0.6z m3.8 11a1.15 1.15 0 0 1 1.15 1.15v5a1.15 1.15 0 0 1-2.3 0v-5a1.15 1.15 0 0 1 1.15-1.15z m1.15 9.85a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 1 1 2.3 0z";

/** 글자와 함께 커지는 크기(EffectIcon 과 같은 방식). 구성품 탭(13)과 유사 제품 배지(12)에서 쓴다. */
const SIZE_CLASS = {
  12: "size-em text-12",
  13: "size-em text-13",
  14: "size-em text-14",
  16: "size-em text-16",
} as const;

export function CautionStatusIcon({
  caution,
  size,
}: {
  readonly caution: boolean;
  readonly size: keyof typeof SIZE_CLASS;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      // 글자 옆에만 쓰이므로 늘 글자와 함께 커진다.
      className={cn("shrink-0", SIZE_CLASS[size], caution ? "text-warning-text" : "text-success-text")}
    >
      <path d={caution ? HAS_CAUTION_PATH : NO_CAUTION_PATH} fillRule="evenodd" />
    </svg>
  );
}
