"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/**
 * 정보 출처 아래의 수정 제안 행. 실제 표기와 다를 수 있다고 알리는 자리에서 바로 정정을 받는다.
 * 출처를 읽은 뒤 필요할 때만 쓰는 보조 동작이라 본문보다 약하게(13 · 보조색) 쓴다(명세 10/21). 누르는 높이 44 와 › 는 그대로다.
 */
export function SuggestEditLink({ productId }: { readonly productId: number }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={`/inquiry/products/${productId}`}
      {...pressableProps}
      className="pressable fb-border flex min-h-11 items-center justify-between gap-2 border-t border-border text-13 leading-snug text-text-secondary"
    >
      정보가 다르다면 수정을 제안해 주세요
      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-text-secondary" />
    </Link>
  );
}
