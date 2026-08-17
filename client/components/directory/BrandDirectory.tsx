"use client";

import type { BrandListItemResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";
import { CHOSEONG_INDEX, choseongOf } from "@/lib/domain/choseong";

const ALL = "전체";

/** S10 브랜드 디렉터리. 초성으로 골라 본다. */
export function BrandDirectory({ brands }: { readonly brands: readonly BrandListItemResponse[] }) {
  const [selected, setSelected] = useState(ALL);

  const shown = selected === ALL ? brands : brands.filter((brand) => choseongOf(brand.name) === selected);

  return (
    <DirectoryList
      railLabel="브랜드 초성"
      rail={[ALL, ...CHOSEONG_INDEX].map((label) => ({ id: label, label }))}
      selectedRailId={selected}
      onSelectRail={setSelected}
      title={selected === ALL ? "전체 브랜드" : `${selected} 브랜드`}
      description={`브랜드 ${shown.length}개`}
      rows={shown.map((brand) => ({
        id: String(brand.id),
        label: brand.name,
        count: brand.productCount,
        href: `/brands/${brand.id}`,
      }))}
    />
  );
}
