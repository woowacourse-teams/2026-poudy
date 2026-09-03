/** 형제 카테고리 줄이 스트리밍되기 전의 자리. 상단바는 기다리지 않는다. */
export function CategoryTrackSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-10 animate-pulse gap-2 overflow-hidden px-4">
      {["w-20", "w-24", "w-20", "w-28"].map((width, index) => (
        <div key={`${width}-${index}`} className={`h-10 ${width} shrink-0 rounded-xl bg-[#F2F3F5]`} />
      ))}
    </div>
  );
}

/** 브랜드 소개가 스트리밍되기 전의 자리. 상단바는 기다리지 않는다. */
export function BrandSummarySkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse items-center gap-3 px-4">
      <div className="size-10 shrink-0 rounded-full bg-[#F2F3F5]" />
      <div className="flex flex-col gap-1.5">
        <div className="h-5 w-24 rounded bg-[#EDEEF0]" />
        <div className="h-3 w-32 rounded bg-[#F2F3F5]" />
      </div>
    </div>
  );
}
