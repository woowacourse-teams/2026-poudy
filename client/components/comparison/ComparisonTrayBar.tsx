"use client";

import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";

import { COMPARISON_RESULT_PATH } from "./paths";

import { useActionsPassed } from "@/components/product/ProductScrollState";
import { ProductImage } from "@/components/ui/ProductImage";
import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import { useHeightVariable } from "@/lib/hooks/useHeightVariable";
import { COMPARISON_MAX, setComparisonCollapsed, type ComparisonItem } from "@/lib/storage/comparison-tray";

/** 둘 이상을 담아야 비교할 수 있다. */
const COMPARISON_MIN = 2;

/** 띠나 알약이 차지한 높이. 떠 있는 문의 버튼이 이만큼 더 올라가 둘이 겹치지 않는다. */
const TRAY_HEIGHT = "--comparison-tray-height";

/**
 * 비교함 띠(시안 v2 V1 · V1-b · V1-c). 담은 제품이 있을 때만 하단 고정 바 바로 위에 띄운다.
 * 하단 바는 저장 버튼 줄이 지나간 뒤에만 올라오므로, 바가 없을 때는 화면 끝에 붙고 바가 올라오면 함께 올라간다.
 * 바와 같은 길이 · 곡선으로 움직여 둘 사이가 벌어지지 않는다.
 *
 * - 띠는 흐름 안에 있어 본문 끝을 가리지 않는다.
 * - ×는 띠를 오른쪽 아래 알약으로 접을 뿐, 담은 제품은 그대로 둔다.
 */
export function ComparisonTrayBar() {
  const { items, collapsed } = useComparisonTray();
  const barShown = useActionsPassed();

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "sticky z-(--z-sticky) transition-all duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none",
        barShown ? "bottom-(--wishlist-shelf-bar-height)" : "bottom-0",
        collapsed && "pointer-events-none h-0",
      )}
    >
      {collapsed ? <Pill items={items} barShown={barShown} /> : <Tray items={items} barShown={barShown} />}
    </div>
  );
}

function Tray({ items, barShown }: { readonly items: readonly ComparisonItem[]; readonly barShown: boolean }) {
  const router = useRouter();
  const canCompare = items.length >= COMPARISON_MIN;
  const emptySlots = COMPARISON_MAX - items.length;
  const trayRef = useHeightVariable<HTMLElement>(TRAY_HEIGHT);

  return (
    <section
      ref={trayRef}
      aria-label="비교함"
      className={cn(
        // 나타날 때 아래에서 살짝 올라온다. 자주 들고 나는 줄이라 짧게 끝낸다.
        "flex min-h-15 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface pt-2 pr-0.5 pl-(--gutter) transition duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none starting:translate-y-2 starting:opacity-0",
        barShown ? "pb-2" : "pb-safe",
      )}
    >
      <p className="text-body-sm leading-none font-bold whitespace-nowrap text-text-primary">비교함</p>
      <ul className="flex items-center gap-1">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex size-9 items-center justify-center rounded-sm border border-border bg-background"
          >
            <ProductImage src={item.imageUrl} alt={`${item.brandName} ${item.name}`} size={28} />
          </li>
        ))}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li
            key={index}
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-sm border border-border-strong text-text-muted"
          >
            <Icon name="plus" size={16} />
          </li>
        ))}
      </ul>
      <div className="flex flex-auto items-center justify-end gap-2">
        <Button variant="outline" disabled={!canCompare} onClick={() => router.push(COMPARISON_RESULT_PATH)}>
          비교하기
        </Button>
        <IconButton label="비교함 접기" icon={<Icon name="x" />} onClick={() => setComparisonCollapsed(true)} />
      </div>
    </section>
  );
}

/** 접힌 띠. 담은 제품 사진을 겹쳐 놓고 개수를 적는다. 누르면 다시 펼친다. */
function Pill({ items, barShown }: { readonly items: readonly ComparisonItem[]; readonly barShown: boolean }) {
  const { pressableProps } = usePressable();
  const pillRef = useHeightVariable<HTMLDivElement>(TRAY_HEIGHT);

  return (
    <div
      ref={pillRef}
      className={cn("absolute inset-x-0 bottom-0 flex justify-end px-gutter", barShown ? "pb-3" : "pb-safe")}
    >
      <button
        type="button"
        aria-label={`비교함 펼치기, 담은 제품 ${items.length}개`}
        {...pressableProps}
        onClick={() => setComparisonCollapsed(false)}
        className="pressable press-scale fb-surface pointer-events-auto flex min-h-10 items-center gap-1 rounded-full border border-border bg-background py-1 pr-3 pl-1 shadow-(--shadow-raised)"
      >
        {/* 사진을 8 씩 겹친다. 칸(20)보다 큰 사진(28)이 넘쳐 겹치고, 넘친 몫을 오른쪽 여백으로 되돌린다. */}
        <span aria-hidden="true" className="flex pr-2">
          {items.map((item) => (
            <span key={item.productId} className="flex w-5">
              <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <ProductImage src={item.imageUrl} size={28} className="p-0.5" />
              </span>
            </span>
          ))}
        </span>
        <span className="text-body-sm leading-none font-bold whitespace-nowrap text-text-primary tabular-nums">
          비교함 {items.length}
        </span>
        <Icon name="chevron-up" size={16} scalable className="text-text-secondary" />
      </button>
    </div>
  );
}
