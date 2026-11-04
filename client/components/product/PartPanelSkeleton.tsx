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

/**
 * 쓰임새 줄. 아이콘 원(32)과 쓰임새 이름 바로 뒤에 성분 칩(32) 자리를 잇고, 자리가 모자라면 칩 자리를 이름 아래 8 로 내린다
 * (UsageIngredients 와 같은 배치).
 */
function UsageRow({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
      <div className="flex h-8 items-center gap-2">
        <Skeleton shape="circle" className="size-8" />
        <Skeleton shape="line" size={14} className="w-16" />
      </div>
      <div className="flex max-w-full grow basis-1/2 flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** 전체 성분 줄(60). 순서와 성분명 자리를 둔다. */
function IngredientRow({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex h-15 items-center gap-2 px-0.5">
      <Skeleton shape="line" size={11} className="w-4" />
      {children}
    </div>
  );
}

/**
 * 구성품을 바꾼 뒤 새 패널을 기다리는 동안 패널 자리에 두는 스켈레톤(명세 S50k).
 *
 * 패널 첫 화면의 모양을 따른다. 나에게 안 맞는 성분 카드 → 주의 성분 확인 → 쓰임새별 성분 → 전체 성분 순서다.
 * 패널 아래쪽의 성분 기준 안내·비슷한 제품·정보 출처는 그리지 않는다. 칩과 이름의 폭은 줄마다 달리한다.
 */
export function PartPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="card" className="h-27 w-full" />

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

      <div className="flex flex-col gap-1">
        <Skeleton shape="line" size={14} className="w-24" />
        <Skeleton shape="line" size={12} className="w-56" />
        <div className="flex flex-col">
          <UsageRow>
            <Skeleton shape="circle" className="h-8 w-22" />
            <Skeleton shape="circle" className="h-8 w-18" />
          </UsageRow>
          <UsageRow>
            <Skeleton shape="circle" className="h-8 w-18" />
            <Skeleton shape="circle" className="h-8 w-24" />
          </UsageRow>
          <UsageRow>
            <Skeleton shape="circle" className="h-8 w-24" />
            <Skeleton shape="circle" className="h-8 w-16" />
          </UsageRow>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton shape="line" size={16} className="w-20" />
        <div className="flex flex-col">
          <IngredientRow>
            <Skeleton shape="line" size={13} className="w-40" />
          </IngredientRow>
          <IngredientRow>
            <Skeleton shape="line" size={13} className="w-30" />
          </IngredientRow>
          <IngredientRow>
            <Skeleton shape="line" size={13} className="w-46" />
          </IngredientRow>
        </div>
      </div>
    </div>
  );
}
