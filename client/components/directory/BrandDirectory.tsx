"use client";

import type { BrandSummaryResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";
import { CHOSEONG_INDEX, choseongOf } from "@/lib/domain/choseong";

const ALL = "전체";
/** 한글이 아닌 이름(3CE, Dr.G 등)을 모아 둘 자리. */
const ETC = "기타";

const rowOf = (brand: BrandSummaryResponse) => ({
  id: String(brand.id),
  label: brand.name,
  count: brand.productCount,
  initial: brand.name.trim().charAt(0),
  imageUrl: brand.imageUrl,
  href: `/brands/${brand.id}`,
});

const indexOf = (brand: BrandSummaryResponse) => choseongOf(brand.name) || ETC;

/**
 * S29 브랜드 디렉터리. 초성으로 골라 본다.
 * `전체` 는 모든 브랜드를 초성 머리글로 묶어 보여 주고, 초성을 고르면 그 초성의 브랜드만 남긴다.
 */
export function BrandDirectory({ brands }: { readonly brands: readonly BrandSummaryResponse[] }) {
  const [selected, setSelected] = useState(ALL);

  // 브랜드가 없는 초성은 눌러도 빈 목록이라 레일에 두지 않는다.
  const present = new Set(brands.map(indexOf));
  const indexes = [...CHOSEONG_INDEX.filter((label) => present.has(label)), ...(present.has(ETC) ? [ETC] : [])];
  const rail = [ALL, ...indexes];

  const sections =
    selected === ALL
      ? indexes.map((label) => ({
          heading: label,
          rows: brands.filter((brand) => indexOf(brand) === label).map(rowOf),
        }))
      : [{ rows: brands.filter((brand) => indexOf(brand) === selected).map(rowOf) }];
  const count = sections.reduce((sum, section) => sum + section.rows.length, 0);

  return (
    <DirectoryList
      railLabel="브랜드 초성"
      rail={rail.map((label) => ({ id: label, label }))}
      selectedRailId={selected}
      onSelectRail={setSelected}
      panels={[
        {
          railId: selected,
          title: selected === ALL ? "전체 브랜드" : `${selected} 브랜드`,
          description: `브랜드 ${count}개`,
          sections,
        },
      ]}
    />
  );
}
