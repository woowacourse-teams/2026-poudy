/**
 * 칩 줄이 붙는 자리. 실제 칩 줄과 스켈레톤이 같은 자리에 붙도록 한곳에서 정한다.
 *
 * 붙는 높이(`top`)와 묶음의 최소 높이는 클래스가 `globals.css` 에서 정한다. `stuckAt` 은 그 높이와 같게 둔다.
 *
 * 묶음의 최소 높이(`runwayClassName`): 결과가 적으면 문서가 짧아 칩 줄이 붙는 자리까지 내려가지 못한다. 그러면 위의 머리가
 * 숨지 못해 칩 줄이 결과가 많을 때와 다른 자리에 머물고, 붙은 채로 조건을 바꿔 결과가 줄면 브라우저가 스크롤을 끌어올려
 * 칩 줄과 목록이 아래로 튄다. 칩 줄이 붙는 자리부터 화면 끝까지를 채워 두면 결과 수와 상관없이 칩 줄이 같은 자리에 붙는다.
 */
export const STICKY_CHIP_BARS = {
  products: {
    stuckAt: 44,
    className: "filter-chip-bar sticky z-(--z-sticky) bg-background",
    runwayClassName: "filter-chip-runway flex flex-1 flex-col",
  },
  category: {
    stuckAt: 56,
    className: "category-filter-chip-bar sticky z-(--z-sticky) bg-background",
    runwayClassName: "category-filter-chip-runway flex flex-1 flex-col",
  },
  brand: {
    stuckAt: 100,
    className: "brand-filter-chip-bar sticky z-(--z-sticky) bg-background",
    runwayClassName: "brand-filter-chip-runway flex flex-1 flex-col",
  },
} as const;

export type StickyChips = keyof typeof STICKY_CHIP_BARS;
