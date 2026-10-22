import { Icon } from "./icons/Icon";

import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number | null;
};

/**
 * 색은 물방울에만 둔다(명세 색상 팔레트 '유수분 데이터', 채택안 ①-b). 채운 칸과 빈 칸은 같은 한 색이고,
 * 색이 아니라 모양으로 가른다. 빈 칸은 같은 색의 테두리만 남은 물방울이다.
 *
 * 단계 이름은 회색 한 가지로 적는다. 물방울 색까지 글자에 옮기면 목록의 행마다 색이 늘어 시끄럽다.
 */
const KIND = {
  moisture: { label: "수분감", droplet: "text-droplet-moisture" },
  oil: { label: "유분감", droplet: "text-droplet-oil" },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸과 단계 이름으로 보여 준다(예: 수분감 보통).
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 글자로 함께 적는다.
 */
export function LevelTag({ kind, level }: LevelTagProps) {
  if (level === null) return null;

  const { label, droplet } = KIND[kind];

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
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
            // 둘레 선의 가장자리 픽셀이 칸 밖에 걸려 잘리지 않게 svg 도 칸 밖을 그린다(sprite 의 물방울 참고).
            className={`overflow-visible ${droplet}`}
          />
        ))}
      </span>
      {/* 좁은 칸에서 글자를 키우면 '수분감'과 단계 이름 사이에서 줄을 바꾼다. 낱말 가운데에서는 가르지 않는다. */}
      <span className="min-w-0 text-caption font-medium break-keep text-text-secondary">
        {label} {levelLabel(level)}
      </span>
    </span>
  );
}
