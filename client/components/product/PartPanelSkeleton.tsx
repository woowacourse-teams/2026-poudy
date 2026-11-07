import { Skeleton } from "@poudy/design-system/skeleton";

/**
 * 주의 성분 확인의 기준 줄. 아이콘 원(32)과 기준 이름 바로 뒤에 걸린 성분 칩(32) 자리를 잇고, 자리가 모자라면 칩 자리를
 * 이름 아래 8 로 내린다(CautionCheck 와 같은 배치).
 */
function CautionRow({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
      <div className="flex h-8 items-center gap-2">
        <Skeleton shape="circle" className="size-8" />
        <Skeleton shape="line" size={14} className="w-24" />
      </div>
      <div className="flex max-w-full grow basis-1/2 flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** 고민 카드의 머리(최소 64). 아이콘 원(36)과 고민 이름, 성분 수 자리를 둔다(UsageIngredients 와 같은 배치). */
function ConcernHeader({ nameClass }: { readonly nameClass: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 px-3 py-3">
      <Skeleton shape="circle" className="size-9" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <Skeleton shape="line" size={14} className={nameClass} />
        <Skeleton shape="line" size={12} className="w-12" />
      </div>
    </div>
  );
}

/**
 * 구성품을 바꾼 뒤 새 패널을 기다리는 동안 패널 자리에 두는 스켈레톤(명세 S50k).
 *
 * 패널 첫 화면의 모양을 따른다. 나에게 안 맞는 성분 카드 → 고민별 성분 → 주의 성분 확인 → 전체 성분 버튼 순서다.
 * 패널 아래쪽의 성분 기준 안내·비슷한 제품·정보 출처는 그리지 않는다. 칩과 이름의 폭은 줄마다 달리한다.
 */
export function PartPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="card" className="h-27 w-full" />

      <div className="flex flex-col gap-4">
        <Skeleton shape="line" size={16} className="w-24" />
        <div className="flex flex-col gap-2">
          {/* 첫 고민은 펼쳐져 있다. 스켈레톤이 회색 면이라 카드 면을 칠하면 같은 색이 되어 사라지므로 자리만 둔다. */}
          <div>
            <ConcernHeader nameClass="w-28" />
            <div className="flex flex-wrap gap-2 pr-3 pb-4 pl-15">
              <Skeleton shape="circle" className="h-8 w-22" />
              <Skeleton shape="circle" className="h-8 w-18" />
              <Skeleton shape="circle" className="h-8 w-24" />
            </div>
          </div>
          <ConcernHeader nameClass="w-24" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton shape="line" size={16} className="w-28" />
        <div className="flex flex-col gap-3 px-0.5 pt-1">
          <CautionRow>
            <Skeleton shape="circle" className="h-8 w-20" />
          </CautionRow>
          <CautionRow>
            <Skeleton shape="circle" className="h-8 w-24" />
          </CautionRow>
          <CautionRow>
            <Skeleton shape="circle" className="h-8 w-18" />
          </CautionRow>
        </div>
      </div>

      <Skeleton shape="card" className="h-11 w-full" />
    </div>
  );
}
