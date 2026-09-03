/** 정렬 줄과 제품 행의 자리. 높이를 실제와 맞춰 두어 내용이 들어와도 아래가 밀리지 않는다. */
export function ProductRowsSkeleton({ rows = 6 }: { readonly rows?: number }) {
  return (
    <>
      <div className="animate-pulse bg-white px-4">
        <div className="flex items-center justify-between py-2">
          <div className="h-4 w-16 rounded bg-[#EDEEF0]" />
          <div className="h-4 w-20 rounded bg-[#EDEEF0]" />
        </div>
      </div>

      <div className="flex-1 animate-pulse px-4">
        <ul className="divide-y divide-divider">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index}>
              <div className="flex items-center gap-3 bg-white py-3">
                <div className="size-20 shrink-0 rounded-lg bg-[#F2F3F5]" />

                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3 w-16 rounded bg-[#EDEEF0]" />
                  <div className="h-4 w-3/4 rounded bg-[#EDEEF0]" />
                  <div className="h-3 w-1/2 rounded bg-[#EDEEF0]" />
                  <div className="flex gap-2">
                    <div className="h-5 w-14 rounded bg-[#F2F3F5]" />
                    <div className="h-5 w-14 rounded bg-[#F2F3F5]" />
                  </div>
                </div>

                <div className="size-6 shrink-0 rounded bg-[#F2F3F5]" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** 조건 줄까지 포함한 자리. 필터 재료조차 아직 없을 때 쓴다. */
export function ProductListSkeleton() {
  return (
    <>
      <div className="flex animate-pulse flex-col gap-3 pt-4">
        <div className="h-3 bg-surface" />

        <div className="bg-white px-4">
          <div className="flex gap-1.5 pb-2">
            {["성분", "카테고리", "브랜드", "유수분"].map((chip) => (
              <div key={chip} className="h-8 w-20 shrink-0 rounded-full bg-[#F2F3F5]" />
            ))}
          </div>
        </div>
      </div>

      <ProductRowsSkeleton />
    </>
  );
}
