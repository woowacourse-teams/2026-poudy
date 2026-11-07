"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { comparisonFlightSource, flyToComparisonTray } from "./fly-to-tray";

import { comparisonHref } from "@/lib/domain/product-comparison";
import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import {
  addComparisonItem,
  getComparisonTraySnapshot,
  removeComparisonItem,
  type ComparisonItem,
} from "@/lib/storage/comparison-tray";

/**
 * 저장 버튼 줄과 하단 고정 바 왼쪽의 '비교함' 버튼(시안 v2 V1 · V1-b). 누르면 담고 다시 누르면 뺀다.
 * 담김 여부는 aria-pressed 로 알린다. 글자를 키우면 폭이 함께 늘도록 폭은 최소값으로 둔다.
 * 담으면 지금 보이는 제품 사진이 비교함으로 들어가는 움직임을 보인다. 세 개가 찼으면 담지 않고 토스트로 알린다.
 */
export function ComparisonToggle({ item }: { readonly item: ComparisonItem }) {
  const router = useRouter();
  const toast = useToast();
  const { items } = useComparisonTray();
  const { pressableProps } = usePressable();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const added = items.some(({ productId }) => productId === item.productId);

  const toggle = () => {
    requestSelectionHaptic();
    if (added) return removeComparisonItem(item.productId);
    if (addComparisonItem(item) === "added") {
      const slot = getComparisonTraySnapshot().items.findIndex(({ productId }) => productId === item.productId);
      // 담은 제품이 칸에 그려진 뒤에 자리를 잰다.
      requestAnimationFrame(() => flyToComparisonTray(comparisonFlightSource(), slot));
      return;
    }
    toast.show({
      message: "비교함이 가득 찼어요",
      action: {
        label: "비교함 보기",
        onClick: () => router.push(comparisonHref(getComparisonTraySnapshot().items)),
        returnFocusTo: buttonRef,
      },
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="비교함에 담기"
      aria-pressed={added}
      {...pressableProps}
      onClick={toggle}
      className={cn(
        "pressable press-scale flex min-h-12 min-w-29 shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-body-sm leading-none font-semibold whitespace-nowrap",
        added
          ? "fb-tint-brand border-brand-border bg-brand-soft text-brand-strong"
          : "fb-secondary border-transparent bg-button-secondary text-text-primary",
      )}
    >
      <Icon name={added ? "check" : "plus"} size={16} scalable />
      {/* 줄 높이가 글자와 같으면 한글이 칸 가운데보다 1 쯤 위에 그려진다. 아이콘과 중심을 맞춘다. */}
      <span className="translate-y-px">비교함</span>
    </button>
  );
}
