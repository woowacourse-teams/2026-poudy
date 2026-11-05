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

/** 비워 둔 띠 자리의 높이. 떠 있는 문의 버튼이 늘 이만큼 더 올라가 있어 띠와 알약에 겹치지 않는다. */
const TRAY_HEIGHT = "--comparison-tray-height";

const NO_ITEMS: readonly ComparisonItem[] = [];

/**
 * 비교함 띠(시안 v2 V1 · V1-b · V1-c). 담은 제품이 있을 때만 하단 고정 바 바로 위에 띄운다.
 * 하단 바는 저장 버튼 줄이 지나간 뒤에만 올라오므로, 바가 없을 때는 화면 끝에 붙고 바가 올라오면 함께 올라간다.
 * 바와 같은 길이 · 곡선으로 움직여 둘 사이가 벌어지지 않는다.
 *
 * - 담고 빼거나 접어도 화면이 움직이지 않아야 한다. 그래서 띠는 흐름 밖에 띄우고, 흐름에는 띠와 같은 모양의 보이지 않는
 *   자리를 늘 둔다. 문서 높이가 그대로라 스크롤 위치와 본문이 밀리지 않고, 본문 끝이 띠에 가리지도 않는다.
 *   같은 모양으로 그리므로 글자를 키워 띠가 두 줄이 되어도 자리가 함께 커진다.
 * - ×는 띠를 오른쪽 아래 알약으로 접을 뿐, 담은 제품은 그대로 둔다.
 */
export function ComparisonTrayBar() {
  const { items, collapsed } = useComparisonTray();
  const barShown = useActionsPassed();
  const reserveRef = useHeightVariable<HTMLDivElement>(TRAY_HEIGHT);

  return (
    <>
      <div ref={reserveRef} data-comparison-reserve aria-hidden="true" inert className="invisible">
        <TrayRow items={NO_ITEMS} barShown />
      </div>
      {items.length > 0 ? (
        <div
          className={cn(
            "sticky z-(--z-sticky) h-0 transition-all duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none",
            barShown ? "bottom-(--wishlist-shelf-bar-height)" : "bottom-0",
          )}
        >
          {/* 띠와 알약은 높이가 달라 같은 요소로 두면 위 끝이 움직인다. 서로 다른 요소로 바꿔 넣는다. */}
          <div
            key={collapsed ? "pill" : "tray"}
            className={cn("absolute inset-x-0 bottom-0", collapsed && "pointer-events-none")}
          >
            {collapsed ? (
              <Pill items={items} barShown={barShown} />
            ) : (
              <section aria-label="비교함">
                <TrayRow items={items} barShown={barShown} />
              </section>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function TrayRow({ items, barShown }: { readonly items: readonly ComparisonItem[]; readonly barShown: boolean }) {
  const router = useRouter();
  const canCompare = items.length >= COMPARISON_MIN;

  return (
    <div
      className={cn(
        // 나타날 때 아래에서 살짝 올라온다. 자주 들고 나는 줄이라 짧게 끝낸다.
        "flex min-h-15 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface pt-2 pr-0.5 pl-(--gutter) transition duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none starting:translate-y-2 starting:opacity-0",
        barShown ? "pb-2" : "pb-safe",
      )}
    >
      <p className="text-body-sm leading-none font-bold whitespace-nowrap text-text-primary">비교함</p>
      <ul className="flex items-center gap-1">
        {/* 칸은 자리로 구분한다. 제품으로 구분하면 담고 뺄 때 칸이 옆으로 밀린다. */}
        {Array.from({ length: COMPARISON_MAX }, (_, slot) => {
          const item = items[slot];
          return (
            <li
              key={slot}
              aria-hidden={item ? undefined : "true"}
              className={cn(
                "flex size-9 items-center justify-center rounded-sm border",
                item ? "border-border bg-background" : "border-border-strong text-text-muted",
              )}
            >
              {item ? (
                <ProductImage
                  key={item.productId}
                  src={item.imageUrl}
                  alt={`${item.brandName} ${item.name}`}
                  size={28}
                />
              ) : (
                <Icon name="plus" size={16} />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-auto items-center justify-end gap-2">
        <Button variant="outline" disabled={!canCompare} onClick={() => router.push(COMPARISON_RESULT_PATH)}>
          비교하기
        </Button>
        <IconButton label="비교함 접기" icon={<Icon name="x" />} onClick={() => setComparisonCollapsed(true)} />
      </div>
    </div>
  );
}

/** 접힌 띠. 담은 제품 사진을 겹쳐 놓고 개수를 적는다. 누르면 다시 펼친다. */
function Pill({ items, barShown }: { readonly items: readonly ComparisonItem[]; readonly barShown: boolean }) {
  const { pressableProps } = usePressable();

  return (
    <div className={cn("flex justify-end px-gutter", barShown ? "pb-3" : "pb-safe")}>
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
