/**
 * 알약 모양 배지. 효과 태그, AI 요약, 배합 목적, 성분군 개수가 함께 쓴다.
 *
 * 줄 높이는 여기서 한 번만 `leading-none` 으로 둔다. 상속받은 줄 높이(1.5)가 남으면 글자 상자가
 * 배지 높이와 따로 놀아, 배지가 놓인 자리에 따라 글자가 아이콘보다 위나 아래로 밀린다.
 * 높이와 색은 design/v2.pen 의 각 배지 값을 그대로 쓴다. 높이는 글자 크기 기준(em)으로 잡아 기기 글자 크기를
 * 키우면 함께 커진다. 나누어떨어지지 않는 값은 1배에서 조금 작아지므로 원래 px 를 아래 한계로 둔다.
 *
 * inline 이 아니라 block 수준의 flex 로 둔다. inline 이면 감싼 `li` 가 상속받은 줄 높이로
 * 줄 상자를 만들어, 배지보다 높아지고 아래에 틈이 생긴다.
 */
const VARIANTS = {
  /** 피부 작용 태그. 24px, 11px 굵게. */
  effect: "h-[max(24px,calc(24em/11))] px-2 bg-[#EFF1F5] text-[11px] font-bold text-[#424E5F]",
  /** AI 요약. 24px, 12px. */
  ai: "h-[max(24px,calc(24em/12))] px-2 bg-[#EEEBFF] text-[12px] font-semibold text-[#4A3B8C]",
  /** 성분군에 든 성분 수(`5종`). 26px. */
  count: "h-[max(26px,calc(26em/12))] px-3 bg-[#EFF1F5] text-[12px] font-semibold text-[#566273]",
  /** 시트 안의 배합 목적. 26px, 11px. */
  role: "h-[max(26px,calc(26em/11))] px-3 bg-[#EFF1F5] text-[11px] font-semibold text-[#424E5F]",
  /** 성분 설명 화면의 배합 목적. 시트보다 한 단계 크다. */
  roleLarge: "h-[max(28px,calc(28em/12))] px-3 bg-[#EFF1F5] text-[12px] font-medium text-[#424E5F]",
  /** 주의 성분이 없음. 비슷한 제품 행의 상태 칩. */
  noCaution: "h-[max(24px,calc(24em/11))] px-2 bg-[#E0F4EA] text-[11px] font-bold text-[#0A6B52]",
  /** 주의 성분이 있음. 색으로도 상태를 가르는 유일한 칩이다. */
  caution: "h-[max(24px,calc(24em/11))] px-2 bg-[#FFF0DC] text-[11px] font-bold text-[#9A4D00]",
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

export function Badge({
  variant,
  icon,
  children,
}: {
  readonly variant: BadgeVariant;
  /** 글자 앞에 붙는 아이콘. 정수 px 크기로 넘겨야 배지 가운데에 반 픽셀 밀리지 않고 선다. */
  readonly icon?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <span
      // 누를 수 있는 행 안에서 행의 바탕색을 따라 배지 바탕을 바꿀 때 이 표지로 찾는다(PRESS_SURFACE_WITH_BADGE).
      data-badge
      className={`flex w-fit shrink-0 items-center gap-1 rounded-full leading-none whitespace-nowrap transition-colors duration-control-state ease-out ${VARIANTS[variant]}`}
    >
      {icon}
      {children}
    </span>
  );
}
