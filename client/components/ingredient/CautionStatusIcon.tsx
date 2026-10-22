import { cn } from "@poudy/design-system/cn";

/**
 * 주의 성분 상태 아이콘. 그림은 명세(poudy-ui.pen)의 `주의 성분 없음 아이콘` · `주의 성분 있음 아이콘` 이다.
 * 명세는 14 칸 안에 플라스크를 10.5 × 11.5 로 그린다. 24 단위로 치면 사방 2 를 띄운 크기(Tabler 아이콘과 같은 여백)라,
 * 명세 경로의 좌표를 2~22 안으로 옮겨 그림 자체가 이 여백을 갖게 했다. 꽉 채우면 이름 뒤에서 글자보다 크고 맞닿아 보인다.
 *
 * 효과 태그와 달리 색으로도 상태를 가르는 유일한 아이콘이다. 없음은 초록, 있음은 주황으로 그린다.
 */
const NO_CAUTION_PATH =
  "M8.833 2h6.333c0.275 0 0.5 0.225 0.5 0.5v0.833c0 0.275-0.225 0.5-0.5 0.5h-0.667v3.117a1 1 0 0 0 0.133 0.5l6.092 10.55a2.667 2.667 0 0 1-2.308 4h-12.833a2.667 2.667 0 0 1-2.308-4l6.092-10.55a1 1 0 0 0 0.133-0.5v-3.117h-0.667c-0.275 0-0.5-0.225-0.5-0.5v-0.833c0-0.275 0.225-0.5 0.5-0.5zm-0.308 13.267l1.625 1.625q0.142 0.142 0.283 0l3.958-3.958a0.917 0.917 0 0 1 1.3 1.3l-4.75 4.75a0.917 0.917 0 0 1-1.3 0l-2.417-2.417a0.917 0.917 0 0 1 1.3-1.3z";

const HAS_CAUTION_PATH =
  "M8.833 2h6.333c0.275 0 0.5 0.225 0.5 0.5v0.833c0 0.275-0.225 0.5-0.5 0.5h-0.667v3.117a1 1 0 0 0 0.133 0.5l6.092 10.55a2.667 2.667 0 0 1-2.308 4h-12.833a2.667 2.667 0 0 1-2.308-4l6.092-10.55a1 1 0 0 0 0.133-0.5v-3.117h-0.667c-0.275 0-0.5-0.225-0.5-0.5v-0.833c0-0.275 0.225-0.5 0.5-0.5zm3.167 9.167a0.958 0.958 0 0 1 0.958 0.958v4.167a0.958 0.958 0 0 1-1.917 0v-4.167a0.958 0.958 0 0 1 0.958-0.958zm0.958 8.208a0.958 0.958 0 1 1-1.917 0a0.958 0.958 0 1 1 1.917 0z";

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
