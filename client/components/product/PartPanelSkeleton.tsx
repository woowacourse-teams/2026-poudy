import { Skeleton } from "@poudy/design-system/skeleton";

/** 고민 그림 카드. 원(84) 아래 8 에 고민 이름과 성분 수 자리를 둔다(UsageIngredients 와 같은 배치). */
function ConcernCard({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <Skeleton shape="circle" className="size-21" />
      <div className="flex flex-col items-center gap-1.5 py-0.5">
        {children}
        <Skeleton shape="line" size={12} className="w-10" />
      </div>
    </div>
  );
}

/** 들어 있는 기준의 접힌 행(48). 아이콘 원(32)과 기준 이름, 오른쪽 성분 수 자리를 둔다(CautionCheck 와 같은 배치). */
function ContainedRow({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex h-12 items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skeleton shape="circle" className="size-8" />
        {children}
      </div>
      <Skeleton shape="line" size={12} className="w-8" />
    </div>
  );
}

/** 통과한 기준 한 칸. 아이콘 원(32)과 기준 이름 자리다. */
function MissingItem({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex h-8 flex-1 items-center gap-2">
      <Skeleton shape="circle" className="size-8" />
      {children}
    </div>
  );
}

/**
 * 구성품을 바꾼 뒤 새 패널을 기다리는 동안 패널 자리에 두는 스켈레톤(명세 S50k).
 *
 * 패널 첫 화면의 모양을 따른다. 나에게 안 맞는 성분 카드 → 고민별 성분 → 민감하다면 살펴볼 성분 → 전체 성분 버튼 순서다.
 * 패널 아래쪽의 성분 기준 안내·비슷한 제품·정보 출처는 그리지 않는다. 이름의 폭은 줄마다 달리한다.
 */
export function PartPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="card" className="h-27 w-full" />

      <div className="flex flex-col gap-4">
        <Skeleton shape="line" size={16} className="w-48" />
        <div className="flex gap-4">
          <ConcernCard>
            <Skeleton shape="line" size={14} className="w-14" />
          </ConcernCard>
          <ConcernCard>
            <Skeleton shape="line" size={14} className="w-16" />
          </ConcernCard>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Skeleton shape="line" size={16} className="w-36" />
        <Skeleton shape="line" size={13} className="w-44" />
        <div className="flex flex-col gap-5 px-0.5 pt-2">
          <div>
            <ContainedRow>
              <Skeleton shape="line" size={14} className="w-28" />
            </ContainedRow>
            <ContainedRow>
              <Skeleton shape="line" size={14} className="w-20" />
            </ContainedRow>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton shape="line" size={12} className="w-22" />
            <div className="flex gap-3">
              <MissingItem>
                <Skeleton shape="line" size={14} className="w-20" />
              </MissingItem>
              <MissingItem>
                <Skeleton shape="line" size={14} className="w-16" />
              </MissingItem>
            </div>
            <div className="flex gap-3">
              <MissingItem>
                <Skeleton shape="line" size={14} className="w-20" />
              </MissingItem>
              <MissingItem>
                <Skeleton shape="line" size={14} className="w-14" />
              </MissingItem>
            </div>
          </div>
        </div>
      </div>

      <Skeleton shape="card" className="h-11 w-full" />
    </div>
  );
}
