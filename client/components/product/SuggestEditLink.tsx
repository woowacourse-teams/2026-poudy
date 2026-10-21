"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/**
 * 정보 출처 아래의 수정 제안 행. 실제 표기와 다를 수 있다고 알리는 자리에서 바로 정정을 받는다.
 * 출처를 읽은 뒤 필요할 때만 쓰는 보조 동작이라 본문보다 약하게(13 · 보조색) 쓴다(명세 10/21). 누르는 높이 44 와 › 는 그대로다.
 *
 * 정보 출처 카드의 맨 아래 줄로, 카드 폭 전체를 차지한다. 그래서 hover 면(STATE · Compact Text)이 카드 양옆과
 * 아래 끝까지 닿고, 카드 모서리를 따라 둥글게 끝난다. 면은 구분선 바로 아래에서 시작한다. 글자는 카드 안쪽
 * 여백(16)에 맞추고, 위 8 은 구분선과의 간격, 아래 4 는 카드 여백이라 글자는 가운데 44 안에 놓인다.
 */
export function SuggestEditLink({ productId }: { readonly productId: number }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={`/inquiry/products/${productId}`}
      {...pressableProps}
      className="pressable fb-border flex min-h-14 items-center justify-between gap-2 rounded-b-lg px-4 pt-2 pb-1 text-13 leading-snug text-text-secondary"
    >
      정보가 다르다면 수정을 제안해 주세요
      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-text-secondary" />
    </Link>
  );
}
