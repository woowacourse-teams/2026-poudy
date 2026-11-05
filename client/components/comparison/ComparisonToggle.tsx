"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { COMPARISON_RESULT_PATH } from "./paths";

import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { addComparisonItem, removeComparisonItem, type ComparisonItem } from "@/lib/storage/comparison-tray";

/**
 * 제품 사진 오른쪽 위의 '비교함' 버튼(시안 v2 V1 · V1-b). 누르면 담고 다시 누르면 뺀다.
 * 담김 여부는 aria-pressed 로 알린다. 보이는 높이는 32 지만 누르는 영역은 위아래로 넓혀 44 를 지킨다.
 * 세 개가 찼으면 담지 않고 토스트로 알린다.
 */
export function ComparisonToggle({ item, className }: { readonly item: ComparisonItem; readonly className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { items } = useComparisonTray();
  const { pressableProps } = usePressable();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const added = items.some(({ productId }) => productId === item.productId);

  const toggle = () => {
    requestSelectionHaptic();
    if (added) return removeComparisonItem(item.productId);
    if (addComparisonItem(item) === "added") return;
    toast.show({
      message: "비교함이 가득 찼어요",
      action: {
        label: "비교함 보기",
        onClick: () => router.push(COMPARISON_RESULT_PATH),
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
        "pressable press-scale flex min-h-8 items-center gap-1 rounded-full border px-3 text-label leading-none font-semibold whitespace-nowrap after:absolute after:-inset-y-1.5 after:inset-x-0",
        added
          ? "fb-tint-brand border-brand-border bg-brand-soft text-brand-strong"
          : "fb-surface border-border bg-background text-text-primary",
        className,
      )}
    >
      <Icon name={added ? "check" : "plus"} size={14} scalable />
      비교함
    </button>
  );
}
