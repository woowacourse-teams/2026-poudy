import { cn } from "./cn";

export type SwitchIndicatorProps = {
  readonly checked: boolean;
  /**
   * 켠 면의 색. 기본은 ui-action 이다.
   * brand 는 켠 면을 분홍 계열로 칠하는 행(명세 APP · 나만의 필터 토글 행 · 켬)에서만 쓴다.
   */
  readonly tone?: "action" | "brand";
  /** 자리. 모양은 부품이 정하므로 여백만 바꾼다. */
  readonly className?: string;
};

/**
 * 스위치 표시(명세 APP · 스위치). 40×24 트랙 안에 지름 20 흰 손잡이를 둔다. 끄면 손잡이가 왼쪽, 켜면 오른쪽이다.
 *
 * 누르는 영역은 행 전체라 표시만 그린다. 쓰는 쪽이 행을 role="switch" + aria-checked 로 만들고 usePressable 을 붙인다.
 * 행 제목을 접근 가능한 이름으로 잇고, 이 표시는 aria-hidden 이다.
 *
 * 상태와 움직임은 행이 붙인 data-hovered · data-pressed 를 보고 switch-indicator 유틸리티가 그린다(MOTION M02).
 * - hover·눌림: 트랙에만 ui-hover-overlay 덮개(fb-overlay). 손잡이와 크기는 그대로다.
 * - 누르는 동안: 손잡이가 20 → 24 로 트랙 안쪽으로 늘어난다(끔은 오른쪽, 켬은 왼쪽).
 * - 놓으면: 손잡이가 반대편으로 옮겨 가고, 늘어난 폭과 트랙 색도 함께 돌아온다.
 * - 키보드로 켜고 끄면 data-pressed 가 붙지 않아 늘어나지 않고 옮겨 가기만 한다. 동작 줄이기에서는 즉시 자리를 바꾼다.
 */
export function SwitchIndicator({ checked, tone = "action", className }: SwitchIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      data-checked={checked ? "" : undefined}
      data-tone={tone}
      className={cn("switch-indicator", className)}
    >
      <span data-switch-thumb="" />
    </span>
  );
}
