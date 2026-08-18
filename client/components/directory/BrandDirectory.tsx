"use client";

import type { BrandListItemResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";
import { CHOSEONG_INDEX, choseongOf } from "@/lib/domain/choseong";

const ALL = "전체";
/** 한글이 아닌 이름(3CE, Dr.G 등)을 모아 둘 자리. */
const ETC = "기타";

/** S10 브랜드 디렉터리. 초성으로 골라 본다. */
export function BrandDirectory({ brands }: { readonly brands: readonly BrandListItemResponse[] }) {
  const [selected, setSelected] = useState(ALL);

  // 브랜드가 없는 초성은 눌러도 빈 목록이라 레일에 두지 않는다.
  const present = new Set(brands.map((brand) => choseongOf(brand.name) || ETC));
  const rail = [ALL, ...CHOSEONG_INDEX.filter((label) => present.has(label))];
  if (present.has(ETC)) rail.push(ETC);

  const shown = selected === ALL ? brands : brands.filter((brand) => (choseongOf(brand.name) || ETC) === selected);

  return (
    <DirectoryList
      railLabel="브랜드 초성"
      rail={rail.map((label) => ({ id: label, label }))}
      selectedRailId={selected}
      onSelectRail={setSelected}
      title={selected === ALL ? "전체 브랜드" : `${selected} 브랜드`}
      description={`브랜드 ${shown.length}개`}
      rows={shown.map((brand) => ({
        id: String(brand.id),
        label: brand.name,
        count: brand.productCount,
        countPrefix: "제품",
        initial: brand.name.trim().charAt(0),
        href: `/brands/${brand.id}`,
      }))}
    />
  );
}
