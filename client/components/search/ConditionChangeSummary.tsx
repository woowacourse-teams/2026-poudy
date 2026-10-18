type ConditionChangeSummaryProps = {
  /** 확인하면 조건에서 빠지는 것. 예: '피하고 싶은 성분 · AHA 성분군' */
  readonly removed: string;
  /** 확인하면 적용되는 것. 예: '원하는 성분 · 글라이콜릭애씨드' */
  readonly applied: string;
};

/** 확인 시트의 내용 칸(명세 S33 · S35). 확인하면 무엇이 빠지고 무엇이 걸리는지 나란히 적는다. */
export function ConditionChangeSummary({ removed, applied }: ConditionChangeSummaryProps) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-surface px-4 py-4">
      <div className="flex gap-4">
        <dt className="w-18 shrink-0 text-body-sm font-semibold text-text-secondary">빠지는 것</dt>
        <dd className="min-w-0 flex-1 text-body font-semibold text-text-primary">{removed}</dd>
      </div>
      <div className="flex gap-4">
        <dt className="w-18 shrink-0 text-body-sm font-semibold text-text-secondary">적용되는 것</dt>
        <dd className="min-w-0 flex-1 text-body font-semibold text-text-primary">{applied}</dd>
      </div>
    </dl>
  );
}
