"use client";

import type { CategoryResponse, ProductRankingItemResponse } from "@poudy/api/api.zod";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { useRef, useState } from "react";

import { type ChoiceChipOption, ChoiceChips } from "./ChoiceChips";

import { ProductGrid, ProductGridCard } from "@/components/product/ProductGridCard";
import { track } from "@/lib/analytics/track";
import { fetchProductRankings } from "@/lib/api/products";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

type Items = readonly ProductRankingItemResponse[];

type PopularProductsProps = {
  /** 서버가 미리 받아 둔 전체 순위. 받지 못했으면 null 이고, 섹션 자리에 오류 줄을 둔다(S51a). */
  readonly initialItems: Items | null;
  readonly categories: readonly CategoryResponse[];
};

/** 칩에 세울 카테고리 수. 명세는 네 개를 보여 준다. */
const CHIP_COUNT = 4;

/** 서버가 최대 여섯 개를 내려 주므로 기다리는 자리도 같은 수로 잡는다. */
const SKELETON_COUNT = 6;

/** 첫 줄은 열자마자 보이는 자리라 미루지 않고 받는다. 3열 기준이다. */
const FIRST_ROW_COUNT = 3;

const TITLE_ID = "home-popular-products";

/** 전체 순위를 가리키는 칩 값 */
const ALL = null;

type Scope = number | typeof ALL;

/** 카테고리마다 받은 결과. 받는 중이면 "loading", 실패했으면 "error" 다. */
type Loaded = Readonly<Record<string, Items | "loading" | "error">>;

const keyOf = (scope: Scope) => String(scope ?? "all");

/**
 * 사람들이 보는 제품(명세 S20, 오류 S51a).
 *
 * 카테고리 칩을 누르면 그 카테고리 안에서 다시 순위를 받아 온다. 한 번 받은 카테고리는 다시 받지 않는다.
 * 받는 일은 칩을 누른 순간 핸들러가 시작한다. 칩을 빠르게 옮기면 늦게 온 응답이 지금 고른 칩의 자리를 덮지 않도록,
 * 결과를 카테고리별 자리에 담고 화면은 지금 고른 칩의 자리만 읽는다.
 */
export function PopularProducts({ initialItems, categories }: PopularProductsProps) {
  const sectionRef = useHomeSectionView("popular_products", 4);
  const [selected, setSelected] = useState<Scope>(ALL);
  /* 바로 앞에 보던 칩. 새 칩의 응답을 기다리는 짧은 동안에는 그 목록을 그대로 둔다. */
  const [previous, setPrevious] = useState<Scope>(ALL);
  const [loaded, setLoaded] = useState<Loaded>(() => ({ [keyOf(ALL)]: initialItems ?? "error" }));
  /* 같은 카테고리를 다시 시도할 때 앞서 보낸 요청의 응답은 버린다. */
  const requests = useRef(new Map<string, number>());

  const state = loaded[keyOf(selected)] ?? "loading";
  /*
   * 스켈레톤은 늦게 켜고, 켜면 잠깐 유지한다(FEEDBACK F02). 켜기 전에는 앞 칩의 목록을 그대로 두어 빈 화면이 깜빡이지 않는다.
   */
  const showSkeleton = useDelayedFlag(state === "loading");
  const before = loaded[keyOf(previous)];
  const keepsBefore = !showSkeleton && state === "loading" && Array.isArray(before);
  const shown = showSkeleton ? "loading" : keepsBefore ? before : state;
  /* 화면에 보이는 목록이 어느 칩의 것인지. 제품을 눌렀을 때 그 칩으로 남긴다. */
  const shownScope = keepsBefore ? previous : selected;

  /* 전체 순위가 원래 비어 있으면 보여 줄 것이 없어 섹션을 그리지 않는다. 실패와는 다르다. */
  if (initialItems !== null && initialItems.length === 0) return null;

  const load = (scope: Scope) => {
    const key = keyOf(scope);
    const id = (requests.current.get(key) ?? 0) + 1;
    requests.current.set(key, id);
    setLoaded((current) => ({ ...current, [key]: "loading" }));

    fetchProductRankings(scope === ALL ? undefined : [scope])
      .then((response) => response.items)
      .catch((): "error" => "error")
      .then((result) => {
        if (requests.current.get(key) !== id) return;
        setLoaded((current) => ({ ...current, [key]: result }));
      });
  };

  const select = ({ value }: ChoiceChipOption<Scope>) => {
    if (value === selected) return;
    setPrevious(selected);
    setSelected(value);
    track("ranking_category_changed", value === ALL ? {} : { category_id: value });
    if (loaded[keyOf(value)] === undefined || loaded[keyOf(value)] === "error") load(value);
  };

  const options: readonly ChoiceChipOption<Scope>[] = [
    { value: ALL, label: "전체" },
    ...categories.slice(0, CHIP_COUNT).map(({ id, name }) => ({ value: id, label: name })),
  ];

  return (
    <section ref={sectionRef} aria-labelledby={TITLE_ID} className="flex flex-col gap-3">
      <h2 id={TITLE_ID} className="text-section font-bold text-text-primary">
        지금 사람들이 보고 있어요
      </h2>

      {categories.length > 0 ? (
        <ChoiceChips aria-labelledby={TITLE_ID} options={options} selected={selected} onSelect={select} />
      ) : null}

      <div aria-busy={state === "loading"}>
        {shown === "loading" ? (
          <ProductsSkeleton />
        ) : shown === "error" ? (
          <ErrorState variant="section" onRetry={() => load(selected)}>
            제품을 불러오지 못했어요
          </ErrorState>
        ) : shown.length === 0 ? (
          <EmptyState title="아직 볼 만한 제품이 모이지 않았어요" />
        ) : (
          <ProductGrid>
            {shown.map(({ product }, index) => (
              <li key={product.id}>
                <ProductGridCard
                  id={product.id}
                  name={product.name}
                  brandName={product.brandName}
                  imageUrl={product.imageUrl}
                  from={shownScope === ALL ? "home_ranking" : "home_category"}
                  loading={index < FIRST_ROW_COUNT ? "eager" : "lazy"}
                  onClick={() =>
                    track("home_product_selected", {
                      product_id: product.id,
                      position: index + 1,
                      ranking_scope: shownScope === ALL ? "overall" : "category",
                      ...(shownScope === ALL ? {} : { category_id: shownScope }),
                    })
                  }
                />
              </li>
            ))}
          </ProductGrid>
        )}
      </div>
    </section>
  );
}

/** 응답을 기다리는 동안 카드와 같은 크기의 자리를 잡는다(FEEDBACK F02). 사진 칸과 두 줄 글자다. */
function ProductsSkeleton() {
  return (
    <ProductGrid>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <li key={index} aria-hidden="true" className="flex flex-col gap-1">
          <Skeleton shape="box" className="aspect-square w-full" />
          <span className="flex flex-col gap-1.5 py-1">
            <Skeleton shape="line" size={13} className="w-full" />
            <Skeleton shape="line" size={13} className="w-2/3" />
          </span>
        </li>
      ))}
    </ProductGrid>
  );
}
