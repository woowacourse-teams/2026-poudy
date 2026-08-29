import { Icon } from "./icons/Icon";

import type { IconId } from "@/components/ui/icons/sprite";

type EmptyNoticeProps = {
  readonly icon: IconId;
  readonly title: string;
  /** 무엇을 하면 채워지는지 덧붙인다. 제목만으로 뜻이 서면 두지 않는다. */
  readonly detail?: string;
  /**
   * 화면 전체가 비어 있을 때는 크게 둔다.
   *
   * 섹션 하나가 빈 것과 화면이 통째로 빈 것은 무게가 다르다. 뒤엣것은 그 화면에서
   * 유일하게 읽을 거리라, 섹션용 크기로 두면 넓은 여백에 파묻힌다.
   */
  readonly size?: "section" | "screen";
  /**
   * 옆이나 위에 선 카드와 높이를 맞춰야 하는 자리에 쓴다.
   * 덧붙이는 말이 없으면 자리가 줄어 한쪽만 주저앉아 보인다.
   */
  readonly className?: string;
};

const SIZE = {
  section: { box: "gap-1.5 px-4 py-6", icon: 20, title: "text-[13px]", detail: "text-[11px]" },
  screen: { box: "gap-2 px-4 py-10", icon: 28, title: "text-[15px]", detail: "text-[12px]" },
} as const;

/**
 * 아직 아무것도 담기지 않은 자리.
 *
 * 채운 회색은 카드처럼 보여 무언가 담긴 자리로 읽힌다. 실제로는 비어 있다는 뜻이므로
 * 배경을 비우고 점선 테두리만 둘러 안이 비었다는 것을 모양으로 드러낸다.
 *
 * 선이 끊겨 있어 같은 색이라도 이어진 선보다 흐리게 읽힌다.
 * `--color-border`(1.21:1) 로는 거의 보이지 않아 칩 테두리와 같은 값을 쓴다.
 *
 * 무엇이 없는지만 말하지 않고 무엇을 하면 채워지는지를 함께 둔다.
 */
export function EmptyNotice({ icon, title, detail, size = "section", className = "" }: EmptyNoticeProps) {
  const shape = SIZE[size];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D3D8] ${shape.box} ${className}`}
    >
      <Icon name={icon} size={shape.icon} className="text-text-secondary" />
      <p className={`font-semibold text-text-primary ${shape.title}`}>{title}</p>
      {/* 덧붙일 말이 없으면 빈 문단이 남지 않게 아예 그리지 않는다. */}
      {detail ? <p className={`text-center text-text-secondary ${shape.detail}`}>{detail}</p> : null}
    </div>
  );
}
