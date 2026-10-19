import { cn } from "./cn";

/** 글자 줄의 높이는 글자 크기와 같다(FEEDBACK F02). */
const LINE_HEIGHT = {
  11: "h-2.75",
  12: "h-3",
  13: "h-3.25",
  14: "h-3.5",
  15: "h-3.75",
  16: "h-4",
  18: "h-4.5",
  20: "h-5",
} as const;

/** 모서리는 자리를 차지할 실제 내용의 모서리를 따른다(SHAPE E01). */
const SHAPE = {
  line: "rounded-xs",
  /** 사진·입력처럼 작은 칸 */
  box: "rounded-sm",
  /** 안내 카드·선택지 */
  panel: "rounded-lg",
  card: "rounded-2xl",
  circle: "rounded-full",
} as const;

export type SkeletonProps =
  | {
      /** 글자 한 줄의 자리. 높이는 size(글자 크기)로 정하고 폭은 className 으로 정한다. */
      readonly shape: "line";
      readonly size: keyof typeof LINE_HEIGHT;
      readonly className?: string;
    }
  | {
      /** 글자가 아닌 면의 자리. 폭과 높이는 className 으로 정한다(예: size-20). */
      readonly shape: Exclude<keyof typeof SHAPE, "line">;
      readonly className?: string;
    };

/**
 * 첫 로딩 동안 실제 내용이 올 자리를 같은 크기의 ui-surface 면으로 채운다(FEEDBACK F02, 기준 화면 S50a).
 * 내용이 와도 자리가 바뀌지 않게 실제와 같은 크기로 둔다.
 *
 * - 펄스는 불투명도 1 → 0.5 → 1, 1.6s 반복이다. 동작 줄이기에서는 멈춘 면으로 둔다(MOTION M02).
 * - 보조 기술에는 읽히지 않는다. 기다리는 영역 쪽에 aria-busy="true" 를 단다(F02). 늦게 켜고 잠깐 유지하는 것은
 *   useDelayedFlag 로 정한다.
 */
export function Skeleton(props: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shrink-0 animate-skeleton bg-surface motion-reduce:animate-none",
        props.shape === "line" ? cn(SHAPE.line, LINE_HEIGHT[props.size]) : SHAPE[props.shape],
        props.className,
      )}
    />
  );
}
