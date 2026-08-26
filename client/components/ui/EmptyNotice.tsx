import { Icon } from "./icons/Icon";

import type { IconId } from "@/components/ui/icons/sprite";

type EmptyNoticeProps = {
  readonly icon: IconId;
  readonly title: string;
  readonly detail: string;
};

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
export function EmptyNotice({ icon, title, detail }: EmptyNoticeProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-[#D1D3D8] px-4 py-6">
      <Icon name={icon} size={20} className="text-text-secondary" />
      <p className="text-[13px] font-semibold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-secondary">{detail}</p>
    </div>
  );
}
