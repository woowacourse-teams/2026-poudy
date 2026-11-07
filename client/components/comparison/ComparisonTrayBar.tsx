"use client";

import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";

import { useActionsPassed } from "@/components/product/ProductScrollState";
import { ProductImage } from "@/components/ui/ProductImage";
import { comparisonHref } from "@/lib/domain/product-comparison";
import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import { useHeightVariable } from "@/lib/hooks/useHeightVariable";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import {
  COMPARISON_MAX,
  removeComparisonItem,
  setComparisonCollapsed,
  type ComparisonItem,
} from "@/lib/storage/comparison-tray";

/** 둘 이상을 담아야 비교할 수 있다. */
const COMPARISON_MIN = 2;

/** 비워 둔 띠 자리의 높이. 떠 있는 문의 버튼이 늘 이만큼 더 올라가 있어 띠와 알약에 겹치지 않는다. */
const TRAY_HEIGHT = "--comparison-tray-height";

const NO_ITEMS: readonly ComparisonItem[] = [];

/**
 * 비교함 띠의 자리(시안 v2 V1). 담고 빼거나 접어도 화면이 움직이지 않도록 띠는 흐름 밖에 띄우고, 흐름에는 띠와 같은 모양의
 * 보이지 않는 자리를 늘 둔다. 문서 높이가 그대로라 스크롤 위치와 본문이 밀리지 않고, 본문 끝이 띠에 가리지도 않는다.
 * 같은 모양으로 그리므로 글자를 키워 띠가 두 줄이 되어도 자리가 함께 커진다.
 */
export function ComparisonTrayReserve() {
  const reserveRef = useHeightVariable<HTMLDivElement>(TRAY_HEIGHT);

  return (
    <div ref={reserveRef} data-comparison-reserve aria-hidden="true" inert className="invisible">
      <TrayRow items={NO_ITEMS} atScreenEnd={false} />
    </div>
  );
}

/**
 * 담은 제품이 있을 때 떠 있는 띠나 알약. 화면 흐름의 맨 끝에 두어 sticky 로 붙인다.
 * ×는 띠를 오른쪽 아래 알약으로 접을 뿐, 담은 제품은 그대로 둔다.
 *
 * @param className 띠를 놓을 높이와 옮기는 움직임
 * @param atScreenEnd 아래에 다른 줄 없이 화면 끝에 닿아 있는지. 닿아 있으면 안전 영역만큼 비운다.
 */
export function ComparisonTrayFloat({
  className,
  atScreenEnd,
}: {
  readonly className: string;
  readonly atScreenEnd: boolean;
}) {
  const { items, collapsed } = useComparisonTray();

  if (items.length === 0) return null;

  return (
    <div className={cn("sticky z-(--z-sticky) h-0", className)}>
      {/* 띠와 알약을 함께 두고 하나만 보인다. 전환이라 빠르게 연달아 눌러도 지금 모양에서 되돌아간다. */}
      <div className={cn("absolute inset-x-0 bottom-0", collapsed && "pointer-events-none")}>
        <section
          aria-label="비교함"
          aria-hidden={collapsed || undefined}
          inert={collapsed}
          data-collapsed={collapsed || undefined}
          className="comparison-tray"
        >
          <TrayRow items={items} atScreenEnd={atScreenEnd} />
        </section>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <Pill items={items} atScreenEnd={atScreenEnd} shown={collapsed} />
      </div>
    </div>
  );
}

/** 누른 버튼이 숨으므로 짝이 되는 버튼으로 포커스를 옮긴다. 숨김이 풀린 뒤에 옮겨야 해 한 프레임 기다린다. */
const moveFocusTo = (selector: string) => {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
};

/**
 * 제품 상세의 띠. 하단 바는 저장 버튼 줄이 지나간 뒤에만 올라오므로, 바가 없을 때는 화면 끝에 붙고 바가 올라오면 바의 높이만큼
 * 함께 올라간다. 바와 같은 길이 · 곡선으로 움직여 둘 사이가 벌어지지 않는다.
 */
export function ProductDetailComparisonTray() {
  const barShown = useActionsPassed();

  return (
    <ComparisonTrayFloat
      atScreenEnd={!barShown}
      className={cn(
        "bottom-0 transition-transform duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none",
        barShown && "-translate-y-(--wishlist-shelf-bar-height)",
      )}
    />
  );
}

function TrayRow({ items, atScreenEnd }: { readonly items: readonly ComparisonItem[]; readonly atScreenEnd: boolean }) {
  const router = useRouter();
  const canCompare = items.length >= COMPARISON_MIN;

  return (
    <div
      className={cn(
        "flex min-h-15 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface pt-2 pr-0.5 pl-(--gutter)",
        atScreenEnd ? "pb-safe" : "pb-2",
      )}
    >
      <p className="text-body-sm leading-none font-bold whitespace-nowrap text-text-primary">비교함</p>
      {/* × 의 누르는 영역이 칸 밖으로 16 나간다. 줄 간격 8 에 오른쪽 여백 8 을 더해 겹치기 전에 줄을 넘긴다. */}
      <ul className="flex items-center gap-1 pr-2">
        {/* 칸은 자리로 구분한다. 제품으로 구분하면 담고 뺄 때 칸이 옆으로 밀린다. */}
        {Array.from({ length: COMPARISON_MAX }, (_, slot) => {
          const item = items[slot];
          return (
            <li
              key={slot}
              data-comparison-slot={slot}
              aria-hidden={item ? undefined : "true"}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-sm border",
                item ? "border-border bg-background" : "border-border-strong text-text-muted",
              )}
            >
              {item ? (
                <>
                  <ProductImage
                    key={item.productId}
                    src={item.imageUrl}
                    alt={`${item.brandName} ${item.name}`}
                    size={28}
                  />
                  <SlotRemoveButton item={item} />
                </>
              ) : (
                <Icon name="plus" size={16} />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-auto items-center justify-end gap-2">
        <Button variant="outline" disabled={!canCompare} onClick={() => router.push(comparisonHref(items))}>
          비교하기
        </Button>
        <IconButton
          label="비교함 접기"
          icon={<Icon name="x" />}
          onClick={() => {
            setComparisonCollapsed(true);
            moveFocusTo("[data-comparison-pill='shown']");
          }}
        />
      </div>
    </div>
  );
}

/**
 * 칸의 빼기 버튼. 보이는 원은 18 로 칸 오른쪽 위에 걸친다. 칸 사이가 40 이라 누르는 영역은 옆 칸과 겹치지 않게 38×46 으로 둔다.
 * 누른 버튼이 사라지므로 포커스를 띠의 접기 버튼으로 옮긴다.
 */
function SlotRemoveButton({ item }: { readonly item: ComparisonItem }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={`${item.name} 빼기`}
      {...pressableProps}
      onClick={() => {
        requestSelectionHaptic();
        removeComparisonItem(item.productId);
        moveFocusTo("section[aria-label='비교함'] button[aria-label='비교함 접기']");
      }}
      className="pressable fb-darken-face absolute -top-1.5 -right-1.5 flex size-4.5 after:absolute after:-inset-x-2.5 after:-inset-y-3.5"
    >
      <span className="flex size-full items-center justify-center rounded-full bg-action text-action-text">
        <Icon name="x" size={12} bold />
      </span>
    </button>
  );
}

/** 접힌 띠. 담은 제품 사진을 겹쳐 놓고 개수를 적는다. 누르면 다시 펼친다. */
function Pill({
  items,
  atScreenEnd,
  shown,
}: {
  readonly items: readonly ComparisonItem[];
  readonly atScreenEnd: boolean;
  readonly shown: boolean;
}) {
  const { pressableProps } = usePressable();

  return (
    <div
      inert={!shown}
      aria-hidden={!shown || undefined}
      className={cn(
        "flex justify-end px-gutter",
        atScreenEnd ? "pb-(--floating-screen-end-gap)" : "pb-(--floating-gap)",
      )}
    >
      <button
        type="button"
        data-comparison-pill={shown ? "shown" : "hidden"}
        aria-label={`비교함 펼치기, 담은 제품 ${items.length}개`}
        {...pressableProps}
        onClick={() => {
          setComparisonCollapsed(false);
          moveFocusTo("section[aria-label='비교함'] button[aria-label='비교함 접기']");
        }}
        className={cn(
          "pressable press-scale fb-surface flex min-h-10 origin-bottom-right items-center gap-1 rounded-full border border-border bg-background py-1 pr-3 pl-1 shadow-(--shadow-raised) transition duration-(--duration-base) ease-(--ease-out) motion-reduce:transform-none",
          shown ? "pointer-events-auto delay-(--duration-fast)" : "scale-95 opacity-0",
        )}
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
