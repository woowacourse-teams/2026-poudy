import { Skeleton } from "@poudy/design-system/skeleton";

/** 결과 행 수. 첫 화면을 채울 만큼만 그린다. */
const ROWS = 4;

/**
 * 유사템 결과의 로딩. 결과 화면(S276)의 기준 제품 판 → 섹션 머리 → 정렬 칩 → 행 자리다. 시작 화면 스켈레톤이 결과로
 * 갈 때 보이지 않도록 따로 둔다. .pen 에는 결과 스켈레톤이 없어 결과 화면 구조에서 모양을 가져왔다.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="유사템을 불러오는 중" aria-busy="true" className="flex flex-col gap-6 pb-inquiry">
      {/* 기준 제품 판은 회색 면이라 안쪽을 나누지 않고 판 하나로 둔다. */}
      <Skeleton shape="panel" className="h-22 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton shape="line" size={16} className="w-36" />
        <div className="flex gap-2">
          <Skeleton shape="circle" className="h-9 w-23" />
          <Skeleton shape="circle" className="h-9 w-30" />
        </div>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: ROWS }, (_, index) => (
            <div key={index} className="flex items-center gap-2 py-4">
              <Skeleton shape="box" className="size-12" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton shape="line" size={15} className="w-52" />
                <Skeleton shape="line" size={12} className="w-24" />
                <Skeleton shape="line" size={12} className="w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
