"use client";

import type { BrandSummaryResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";
import { track } from "@/lib/analytics/track";
import { CHOSEONG_INDEX, choseongOf } from "@/lib/domain/choseong";

const ALL = "전체";
/**
 * 한글로 시작하지 않는 이름(SK-II, 3CE 등)을 모아 둘 자리. 한글 초성 다음에 둔다.
 * 숫자나 기호로 시작하는 이름도 따로 칸을 나누지 않고 함께 모은다. 한두 개뿐인 칸이 늘어나면 레일만 길어진다.
 */
const LATIN = "A-Z";

const rowOf = (brand: BrandSummaryResponse) => ({
  id: String(brand.id),
  label: brand.name,
  count: brand.productCount,
  initial: brand.name.trim().charAt(0),
  imageUrl: brand.imageUrl,
  href: `/brands/${brand.id}`,
});

const indexOf = (brand: BrandSummaryResponse) => choseongOf(brand.name) || LATIN;

/**
 * S29 브랜드 디렉터리. 초성으로 골라 본다.
 * `전체` 는 모든 브랜드를 초성 머리글로 묶어 보여 주고, 초성을 고르면 그 초성의 브랜드만 남긴다.
 */
export function BrandDirectory({ brands }: { readonly brands: readonly BrandSummaryResponse[] }) {
  const [selected, setSelected] = useState(ALL);

  // 브랜드가 없는 초성은 눌러도 빈 목록이라 레일에 두지 않는다.
  const present = new Set(brands.map(indexOf));
  const indexes = [...CHOSEONG_INDEX.filter((label) => present.has(label)), ...(present.has(LATIN) ? [LATIN] : [])];
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
      // 어느 칸에서 골랐는지 함께 남겨, 전체 목록에서 훑어 고르는지 초성으로 좁혀 고르는지 본다.
      onSelectRow={(row) =>
        track("brand_selected", { brand_id: Number(row.id), brand_name: row.label, index_label: selected })
      }
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
