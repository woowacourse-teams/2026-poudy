import { Icon } from "./icons/Icon";

import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number;
  /**
   * pill 은 제품 상세에서 쓰는 회색 알약 형태로, 단계 이름까지 함께 적는다.
   * plain 은 목록 카드에서 쓰는 글자만 있는 형태다.
   */
  readonly variant?: "plain" | "pill";
};

const TEXT = {
  moisture: { label: "수분", filled: "text-droplet-moisture", empty: "text-droplet-empty" },
  oil: { label: "유분", filled: "text-droplet-oil", empty: "text-droplet-empty-oil" },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸으로 보여 준다.
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 함께 읽히게 한다.
 */
export function LevelTag({ kind, level, variant = "plain" }: LevelTagProps) {
  const { label, filled, empty } = TEXT[kind];
  const pill = variant === "pill";

  return (
    <span
      className={
        pill
          ? "inline-flex h-7 items-center gap-1.5 rounded-[14px] bg-[#F4F5F6] px-[9px]"
          : "inline-flex items-center gap-1"
      }
    >
      <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {dropletFills(level).map((isFilled, index) => (
          <Icon
            key={index}
            name="droplet"
            width={13}
            height={16}
            preserveRatio
            strokeWidth={2.5}
            filled={isFilled}
            className={isFilled ? filled : empty}
          />
        ))}
      </span>
      {pill ? (
        <span className="text-[12px] font-semibold text-[#54575C]">
          {label} {levelLabel(level)}
        </span>
      ) : (
        <>
          <span className={`text-[12px] font-semibold ${filled}`}>{label}</span>
          <span className="sr-only">{levelLabel(level)}</span>
        </>
      )}
    </span>
  );
}
