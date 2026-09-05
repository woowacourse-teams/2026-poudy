/** 한 제품의 이미지와 텍스트가 함께 준비되는 동안 그 카드 자리만 가린다. */
export function ProductCardSkeleton({ overlay = false }: { readonly overlay?: boolean }) {
  return (
    <div data-product-skeleton aria-hidden="true" className={overlay ? "absolute inset-0 z-10 bg-white" : "bg-white"}>
      <div className="flex h-full min-h-27 animate-pulse items-center gap-3 py-3">
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

        <div className="flex size-11 shrink-0 items-center justify-center">
          <div className="size-5 rounded bg-[#F2F3F5]" />
        </div>
      </div>
    </div>
  );
}
