"use client";

import { Dropdown, type DropdownOption } from "@poudy/design-system/dropdown";

import { SORTS, type Sort } from "@/lib/domain/filter";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

export const SORT_LABELS: Record<Sort, string> = {
  DEFAULT: "기본순",
  PRICE_ASC: "가격 낮은순",
  PRICE_DESC: "가격 높은순",
  UNIT_PRICE_ASC: "용량별 가격 낮은순",
  UNIT_PRICE_DESC: "용량별 가격 높은순",
};

/**
 * 고를 수 있는 값과 화면에 적을 이름의 짝.
 * 위시리스트처럼 API 의 sort 에 없는 기준을 쓰는 화면이 있어 목록을 밖에서 받는다.
 */
export type SortOption<T extends string> = DropdownOption<T>;

export const PRODUCT_SORT_OPTIONS: readonly SortOption<Sort>[] = SORTS.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

type SortDropdownProps<T extends string> = {
  readonly value: T;
  readonly onChange: (sort: T) => void;
  /** 고를 수 있는 목록. 기본은 제품 목록이 쓰는 정렬 5 종이다. */
  readonly options?: readonly SortOption<T>[];
};

/**
 * 정렬 고르기. 모양과 동작은 디자인 시스템 `Dropdown`이 맡고, 여기서는 정렬 기준 목록과 고를 때의 햅틱만 정한다.
 * 제품 목록(조건 일치 제품·카테고리 상품·브랜드 상세)과 위시리스트가 목록 결과 헤더에서 쓴다.
 */
export function SortDropdown<T extends string = Sort>({
  value,
  onChange,
  options = PRODUCT_SORT_OPTIONS as readonly SortOption<T>[],
}: SortDropdownProps<T>) {
  return (
    <Dropdown
      aria-label="정렬 기준"
      value={value}
      options={options}
      onChange={(sort) => {
        requestSelectionHaptic();
        onChange(sort);
      }}
    />
  );
}
