import { keepIf } from "./optional";

/** 접힌 전성분에서 감춘 성분 묶음. 명세의 `06~13번 성분 8개` 줄이다. */
export type CollapsedGap = {
  /** 감춘 첫 성분과 마지막 성분의 표기 순서(1부터). */
  readonly from: number;
  readonly to: number;
};

export type CollapsedView = {
  /** 접힌 동안에도 보이는 성분의 자리(0부터). */
  readonly visible: ReadonlySet<number>;
  /** 이 자리의 성분 앞에 감춘 성분 묶음을 알린다. 목록 끝에서 감춘 성분은 펼치기 버튼이 알린다. */
  readonly gapsBefore: ReadonlyMap<number, CollapsedGap>;
  readonly hiddenCount: number;
};

/**
 * 전성분을 접었을 때 무엇을 보일지 정한다(명세 S24 `전성분 앞 5개 목록`).
 *
 * 앞에서 `count` 개와, 그 뒤라도 주의 성분은 보인다. 주의 성분이 접힌 쪽에 숨으면 위의 주의 성분 확인과
 * 목록이 서로 맞지 않아 보인다. 보이는 성분 사이에 감춘 성분이 끼면 그 자리에 몇 번부터 몇 번까지인지 알린다.
 */
export const collapsedView = (cautions: readonly boolean[], count: number): CollapsedView => {
  const visible = new Set(cautions.flatMap((caution, index) => keepIf(index < count || caution, index)));
  const shown = [...visible];
  const gapsBefore = new Map(
    shown.flatMap((index, order) => {
      // 첫 행 앞에는 자리 -1 이 보인다고 보고 센다. 그래야 맨 앞부터 감춘 성분도 같은 규칙으로 잡힌다.
      const previous = shown[order - 1] ?? -1;
      return keepIf<[number, CollapsedGap]>(index - previous > 1, [index, { from: previous + 2, to: index }]);
    }),
  );

  return { visible, gapsBefore, hiddenCount: cautions.length - visible.size };
};
