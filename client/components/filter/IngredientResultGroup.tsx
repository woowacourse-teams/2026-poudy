import type { ReactNode } from "react";

type IngredientResultGroupProps = {
  /** 묶음 이름. '성분군' 또는 '성분'이다. */
  readonly title: string;
  readonly count: number;
  readonly children: ReactNode;
};

/**
 * 성분 검색 결과의 묶음(명세 S32 · S33의 '결과 묶음 Header'). 결과를 '성분군 N', '성분 N'으로 나누고 묶음마다
 * 작은 머리를 둔다. 탐색 조건의 성분 추가 화면과 조건 일치 제품의 성분 시트 검색 화면이 함께 쓴다.
 *
 * 머리는 화면에 보이는 글자이고, 낭독기에는 묶음 이름과 개수를 section 이름으로 한 번 읽힌다.
 */
export function IngredientResultGroup({ title, count, children }: IngredientResultGroupProps) {
  return (
    <section aria-label={`${title} ${count}개`} className="flex flex-col">
      <h3 aria-hidden="true" className="flex gap-1 pt-3 pb-1 text-body-sm text-text-secondary">
        <span className="font-semibold">{title}</span>
        <span className="font-medium">{count}</span>
      </h3>
      {/* 행마다 아래 선을 그린다(IngredientResultRow). */}
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}
