"use client";

import type { BrandResponse } from "@poudy/api/api.zod";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { SearchField } from "@poudy/design-system/search-field";
import { useId, useState } from "react";

import { formatCount } from "@/lib/domain/format";

type BrandOptionsProps = {
  readonly brands: readonly BrandResponse[];
  readonly selectedIds: readonly number[];
  readonly onChange: (brandIds: readonly number[]) => void;
};

/** 브랜드 시트(명세 S23a). 검색으로 좁히고 여러 개를 고른다. */
export function BrandOptions({ brands, selectedIds, onChange }: BrandOptionsProps) {
  const [keyword, setKeyword] = useState("");
  const headingId = useId();

  // 목록이 이미 손에 있으므로 서버에 다시 묻지 않는다.
  const query = keyword.trim().toLowerCase();
  const shown = query
    ? brands.filter((brand) => `${brand.name} ${brand.englishName ?? ""}`.toLowerCase().includes(query))
    : brands;

  return (
    <div className="flex flex-col gap-3">
      <SearchField value={keyword} onChange={setKeyword} placeholder="브랜드명 검색" label="브랜드명 검색" />

      <div className="flex flex-col gap-1">
        <div className="flex h-8 items-center justify-between">
          <h3 id={headingId} className="text-body-sm font-semibold text-text-primary">
            전체 브랜드 {formatCount(brands.length)}
          </h3>
          {selectedIds.length > 0 ? (
            <span className="text-body-sm text-text-secondary">{formatCount(selectedIds.length)} 선택</span>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-text-secondary">찾는 브랜드가 없어요.</p>
        ) : (
          <CheckboxGroup
            aria-labelledby={headingId}
            value={selectedIds.map(String)}
            onValueChange={(ids) => onChange(ids.map(Number))}
          >
            {shown.map((brand) => (
              <CheckboxGroupItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </CheckboxGroupItem>
            ))}
          </CheckboxGroup>
        )}
      </div>
    </div>
  );
}
