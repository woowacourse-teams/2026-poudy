import { Icon } from "./icons/Icon";

import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number;
};

const TEXT = {
  moisture: { label: "수분", filled: "text-droplet-moisture", empty: "text-droplet-empty" },
  oil: { label: "유분", filled: "text-droplet-oil", empty: "text-droplet-empty-oil" },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸으로 보여 준다.
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 함께 읽히게 한다.
 */
export function LevelTag({ kind, level }: LevelTagProps) {
  const { label, filled, empty } = TEXT[kind];

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {dropletFills(level).map((isFilled, index) => (
          <Icon key={index} name="droplet" size={10} filled={isFilled} className={isFilled ? filled : empty} />
        ))}
      </span>
      <span className={`text-[12px] font-semibold ${filled}`}>{label}</span>
      <span className="sr-only">{levelLabel(level)}</span>
    </span>
  );
}
