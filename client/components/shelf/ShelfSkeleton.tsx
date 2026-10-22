import { Skeleton } from "@poudy/design-system/skeleton";

/** 제품 행 하나의 자리. 썸네일(64)과 브랜드·이름·평가 요약 세 줄이다(명세 APP · 선반 제품 행). */
function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-2">
      <Skeleton shape="card" className="size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton shape="line" size={12} className="w-14" />
        <Skeleton shape="line" size={16} className="w-40 max-w-full" />
        <Skeleton shape="line" size={12} className="w-24" />
      </div>
    </div>
  );
}

/**
 * 선반을 처음 불러오는 동안의 자리(FEEDBACK F02, 기준 화면 S50a). 성분 카드, 보기 필터, 제품 행 넷을 같은 크기로 채운다.
 * 보조 기술에는 읽히지 않고, 기다리는 영역(aria-busy)이 상태를 알린다.
 */
export function ShelfSkeleton() {
  return (
    // 불러온 뒤의 본문처럼 위 여백 없이 큰 제목 내비 바로 아래에서 시작한다(S52).
    <div className="flex flex-col gap-4 px-gutter pb-6">
      <Skeleton shape="card" className="h-52 w-full" />
      <div className="flex gap-2">
        <Skeleton shape="circle" className="h-8 w-16" />
        <Skeleton shape="circle" className="h-8 w-18" />
        <Skeleton shape="circle" className="h-8 w-20" />
      </div>
      <div className="flex flex-col">
        <Skeleton shape="line" size={13} className="w-8" />
        <div className="flex flex-col pt-3">
          {[0, 1, 2, 3].map((index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
