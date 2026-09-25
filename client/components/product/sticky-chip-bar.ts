/**
 * 칩 줄이 붙는 자리. 실제 칩 줄과 스켈레톤이 같은 자리에 붙도록 한곳에서 정한다.
 *
 * 붙는 높이(`top`)는 클래스가 `globals.css` 에서 정한다. `stuckAt` 은 그 높이와 같게 둔다.
 */
export const STICKY_CHIP_BARS = {
  summary: { stuckAt: 44, className: "filter-chip-bar" },
  category: { stuckAt: 56, className: "category-filter-chip-bar" },
  brand: { stuckAt: 100, className: "brand-filter-chip-bar" },
} as const;

export type StickyChips = keyof typeof STICKY_CHIP_BARS;
