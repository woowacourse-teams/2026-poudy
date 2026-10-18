import { Skeleton } from "@poudy/design-system/skeleton";

import { STICKY_CHIP_BARS, type StickyChips } from "./sticky-chip-bar";

/** 첫 로딩에 보이는 카드 자리 수(명세 S50a). 첫 화면을 채우는 만큼만 둔다. */
const SKELETON_ROWS = 5;

/** 상품 목록 카드(r4q5g) 한 장의 자리. 사진 80 과 글자 세 줄을 실제와 같은 높이로 둔다. */
function ProductCardSkeleton() {
  return (
    <div data-product-skeleton className="flex items-center gap-3 border-b border-border py-3">
      <Skeleton shape="box" className="size-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton shape="line" size={12} className="w-14" />
        <Skeleton shape="line" size={15} className="w-full" />
        <Skeleton shape="line" size={12} className="w-2/5" />
      </div>
    </div>
  );
}

/** 결과 수와 카드의 자리. 높이를 실제와 맞춰 두어 내용이 들어와도 아래가 밀리지 않는다(명세 S50a). */
export function ProductRowsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-1 flex-col gap-2 px-gutter">
      <div className="flex h-10 items-center">
        <Skeleton shape="line" size={13} className="w-16" />
      </div>
      <div>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

const CHIP_IDS = ["ingredient", "category", "brand", "level", "skinType"] as const;

/** 칩 줄 자리. 필터 재료조차 아직 없을 때 쓴다. */
function ChipBarSkeleton({ hiddenChips }: { readonly hiddenChips: readonly string[] }) {
  return (
    <div className="flex h-11 items-center gap-2 overflow-hidden px-gutter">
      {CHIP_IDS.filter((chip) => !hiddenChips.includes(chip)).map((chip) => (
        <Skeleton key={chip} shape="circle" className="h-8 w-20" />
      ))}
    </div>
  );
}

/** 칩 줄까지 포함한 자리. 서버가 필터 재료를 받는 동안 쓴다. */
export function ProductListSkeleton({
  hiddenChips = [],
  stickyChips,
}: {
  readonly hiddenChips?: readonly string[];
  readonly stickyChips?: StickyChips;
}) {
  return (
    <>
      {stickyChips ? (
        <div className={STICKY_CHIP_BARS[stickyChips].className}>
          <ChipBarSkeleton hiddenChips={hiddenChips} />
        </div>
      ) : (
        <div className="pt-2">
          <ChipBarSkeleton hiddenChips={hiddenChips} />
        </div>
      )}
      <div className="flex flex-1 flex-col pt-2">
        <ProductRowsSkeleton />
      </div>
    </>
  );
}
