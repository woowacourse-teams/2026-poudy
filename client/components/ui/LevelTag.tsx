import { Icon } from "./icons/Icon";

import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number;
};

/**
 * 물방울과 글자의 색을 나눈다. 물방울은 도형이라 밝은 색을 그대로 쓰지만, 글자까지
 * 같은 색으로 두면 흰 배경에서 읽히지 않는다. 글자는 같은 계열의 진한 단계를 쓴다.
 */
const TEXT = {
  moisture: {
    label: "수분",
    filled: "text-droplet-moisture",
    empty: "text-droplet-empty",
    text: "text-level-moisture-text",
  },
  oil: {
    label: "유분",
    filled: "text-droplet-oil",
    empty: "text-droplet-empty-oil",
    text: "text-level-oil-text",
  },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸으로 보여 준다.
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 함께 읽히게 한다.
 */
export function LevelTag({ kind, level }: LevelTagProps) {
  const { label, filled, empty, text } = TEXT[kind];

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {dropletFills(level).map((isFilled, index) => (
          <Icon
            key={index}
            name={isFilled ? "droplet-solid" : "droplet"}
            /*
             * 옆 글자(12px)보다 조금 크게 둔다. 물방울 3 칸이 이 태그의 값이라
             * 글자에 딱 맞추면 눈에 덜 들어온다. viewBox 가 14:20 이라
             * 세로 14 에 가로는 10 이 되고, preserveRatio 가 그 비율을 지킨다.
             */
            width={10}
            height={14}
            preserveRatio
            className={isFilled ? filled : empty}
          />
        ))}
      </span>
      <span className={`text-[12px] leading-none font-semibold ${text}`}>{label}</span>
      <span className="sr-only">{levelLabel(level)}</span>
    </span>
  );
}
