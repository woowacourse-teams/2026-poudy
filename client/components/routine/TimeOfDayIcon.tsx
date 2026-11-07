import Image from "next/image";

import type { TimeOfDay } from "@/lib/domain/routine";

/**
 * 아침(해)·저녁(달) 그림. 색이 여럿인 그림이라 선 아이콘 체계(Icon) 밖의 SVG 파일로 둔다.
 * 옆 글자가 구간 이름을 말하므로 보조 기술에서는 감춘다.
 */
export function TimeOfDayIcon({ timeOfDay, size }: { readonly timeOfDay: TimeOfDay; readonly size: number }) {
  return (
    <Image
      src={`/images/routine/${timeOfDay}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className="shrink-0"
    />
  );
}
