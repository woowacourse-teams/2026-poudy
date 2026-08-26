"use client";

import type { BrandResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckMark } from "@/components/ui/CheckMark";
import { SearchField } from "@/components/ui/SearchField";

type BrandOptionsProps = {
  readonly brands: readonly BrandResponse[];
  readonly selectedIds: readonly number[];
  readonly onToggle: (brandId: number) => void;
};

/** 디자인의 브랜드 시트. 검색으로 좁히고 여러 개를 고른다. */
export function BrandOptions({ brands, selectedIds, onToggle }: BrandOptionsProps) {
  const [keyword, setKeyword] = useState("");

  // 목록이 이미 손에 있으므로 서버에 다시 묻지 않는다.
  const shown = keyword.trim()
    ? brands.filter((brand) =>
        `${brand.name} ${brand.englishName ?? ""}`.toLowerCase().includes(keyword.trim().toLowerCase()),
      )
    : brands;

  return (
    <>
      <SearchField value={keyword} onChange={setKeyword} placeholder="브랜드명 검색" label="브랜드명 검색" />

      <ul className="pt-2">
        {shown.map((brand) => {
          const selected = selectedIds.includes(brand.id);

          return (
            <li key={brand.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onToggle(brand.id)}
                className="flex h-12 w-full items-center gap-2.5 border-b border-border px-1 text-left"
              >
                <CheckMark checked={selected} />
                <span className={`text-[15px] text-[#212124] ${selected ? "font-semibold" : "font-normal"}`}>
                  {brand.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-text-secondary">찾는 브랜드가 없어요.</p>
      ) : null}
    </>
  );
}
