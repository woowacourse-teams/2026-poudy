import { ProductCardSkeleton } from "@/components/ui/ProductCardSkeleton";

/** 정렬 줄과 제품 행의 자리. 높이를 실제와 맞춰 두어 내용이 들어와도 아래가 밀리지 않는다. */
export function ProductRowsSkeleton({ rows = 20 }: { readonly rows?: number }) {
  return (
    <>
      <div aria-hidden="true" className="animate-pulse bg-white px-4">
        <div className="flex items-center justify-between py-2">
          <div className="h-4 w-16 rounded bg-[#EDEEF0]" />
          <div className="h-9 w-20 rounded-[10px] bg-[#F2F3F5]" />
        </div>
      </div>

      <div aria-hidden="true" className="flex-1 px-4">
        <ul className="divide-y divide-divider">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** 조건 줄까지 포함한 자리. 필터 재료조차 아직 없을 때 쓴다. */
export function ProductListSkeleton({ hiddenChips = [] }: { readonly hiddenChips?: readonly string[] }) {
  return (
    <>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-3 pt-4">
        <div className="h-3 bg-surface" />

        <div className="bg-white px-4">
          <div className="flex gap-1.5 pb-2">
            {["ingredient", "category", "brand", "level"]
              .filter((chip) => !hiddenChips.includes(chip))
              .map((chip) => (
                <div key={chip} className="h-8 w-20 shrink-0 rounded-full bg-[#F2F3F5]" />
              ))}
          </div>
        </div>
      </div>

      <ProductRowsSkeleton />
    </>
  );
}
