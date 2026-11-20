import { Skeleton } from "@poudy/design-system/skeleton";

/** 저렴이 행 수(명세 S282). */
const ROWS = 3;

/**
 * 유사템 시작 화면의 첫 로딩(명세 S282). 입력칸 · 소개 판 · 저렴이 섹션 자리다. 결과 화면은 [productId]/loading.tsx 가 따로 그린다.
 * 저렴이 행의 사진과 글 사이는 실제 행처럼 12 띄운다.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="유사템을 불러오는 중" aria-busy="true" className="flex flex-col gap-6 pb-inquiry">
      <div className="flex flex-col gap-4">
        <Skeleton shape="box" className="h-12 w-full" />
        <Skeleton shape="panel" className="h-19 w-full" />
      </div>
      <div className="flex flex-col">
        <Skeleton shape="line" size={16} className="w-40" />
        {Array.from({ length: ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-4">
            <Skeleton shape="box" className="size-14.5" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton shape="line" size={12} className="w-40" />
              <Skeleton shape="line" size={16} className="w-55" />
              <Skeleton shape="line" size={14} className="w-30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
