import { Icon } from "./icons/Icon";

import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number;
};

/**
 * 물방울과 글자의 색을 나눈다. 물방울은 도형이라 밝은 색을 그대로 쓰지만, 글자까지
 * 같은 색으로 두면 흰 배경에서 읽히지 않는다. 글자는 같은 계열의 진한 단계를 쓴다.
 *
 * 채운 칸과 빈 칸은 색이 아니라 모양으로 가른다. 빈 칸은 같은 색의 테두리만 남은 물방울이다.
 */
const TEXT = {
  moisture: { label: "수분", droplet: "text-droplet-moisture", text: "text-level-moisture-text" },
  oil: { label: "유분", droplet: "text-droplet-oil", text: "text-level-oil-text" },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸으로 보여 준다.
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 함께 읽히게 한다.
 */
export function LevelTag({ kind, level }: LevelTagProps) {
  const { label, droplet, text } = TEXT[kind];

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {dropletFills(level).map((isFilled, index) => (
          <Icon
            key={index}
            name={isFilled ? "droplet-solid" : "droplet"}
            /*
             * 디자인은 물방울을 8.28×12 로 그린다. 둘레의 0.8 선을 담으려 viewBox 를 넓힌 만큼
             * 크기도 같은 비율로 키워 물방울 자체는 디자인 크기 그대로 보이게 한다.
             */
            width={8.88}
            height={12.6}
            preserveRatio
            scalable
            className={droplet}
          />
        ))}
      </span>
      <span className={`text-[12px] leading-none font-semibold ${text}`}>{label}</span>
      <span className="sr-only">{levelLabel(level)}</span>
    </span>
  );
}
