"use client";

import type { CategoryResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckMark } from "@/components/ui/CheckMark";
import { Icon } from "@/components/ui/icons/Icon";

type CategoryOptionsProps = {
  readonly categories: readonly CategoryResponse[];
  readonly selectedIds: readonly number[];
  readonly onSelect: (categoryIds: readonly number[]) => void;
};

/**
 * 대분류를 펼쳐 소분류를 여러 개 고른다. 전체 선택도 다른 대분류의 선택은 보존한다.
 */
export function CategoryOptions({ categories, selectedIds, onSelect }: CategoryOptionsProps) {
  const selectedChild = categories
    .flatMap((category) => category.children.map((child) => ({ category, child })))
    .find(({ child }) => selectedIds.includes(child.id));

  const [expandedId, setExpandedId] = useState<number | undefined>(
    () => selectedChild?.category.id ?? categories[0]?.id,
  );

  return (
    <ul className="pt-1">
      {categories.map((category) => {
        const expanded = category.id === expandedId;

        return (
          <li key={category.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedId(expanded ? undefined : category.id)}
              className={`flex h-10 w-full items-center justify-between px-3 text-[15px] font-semibold text-[#212124] ${
                expanded ? "rounded-[10px] bg-[#F7F7F8]" : "border-b border-border"
              }`}
            >
              {category.name}
              <Icon
                name="chevron-down"
                size={16}
                className={`category-disclosure-chevron ${expanded ? "rotate-180 text-[#555A62]" : "text-[#868B94]"}`}
              />
            </button>

            {/*
              접힌 것도 지우지 않고 남겨 둔다. 열고 닫는 전환은 두 높이 사이를 잇는 것이라
              한쪽이 없으면 걸리지 않는다. 대신 접힌 동안에는 `inert` 로 손과 초점을 막는다.
            */}
            <div className="category-disclosure" data-open={expanded}>
              <div>
                <ul inert={!expanded}>
                  {[{ id: 0, name: "전체", productCount: category.productCount }, ...category.children].map((child) => {
                    // 전체는 대분류의 소분류를 모두 고른 것과 같다.
                    const ids = child.id === 0 ? category.children.map((item) => item.id) : [child.id];
                    const selected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));

                    return (
                      <li key={child.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          onClick={() => onSelect(toggleCategoryIds(selectedIds, ids))}
                          className={`flex h-10 w-full items-center gap-2.5 py-0 pr-3 pl-7 text-left ${
                            selected ? "rounded-[10px] bg-[#F2F3F5]" : ""
                          }`}
                        >
                          <CheckMark checked={selected} />
                          <span
                            className={`text-[14px] ${selected ? "font-semibold text-[#212124]" : "text-[#555A62]"}`}
                          >
                            {child.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 모두 고른 범위는 해제하고, 일부만 고른 범위는 나머지를 추가한다. */
const toggleCategoryIds = (selected: readonly number[], targets: readonly number[]): readonly number[] =>
  targets.every((id) => selected.includes(id))
    ? selected.filter((id) => !targets.includes(id))
    : [...new Set([...selected, ...targets])];
