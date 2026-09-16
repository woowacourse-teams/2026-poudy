"use client";

import type { CategoryResponse, ProductRankingItemResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductThumbnail";
import { track } from "@/lib/analytics/track";
import { fetchProductRankings } from "@/lib/api/products";

type PopularProductsProps = {
  /** 서버가 미리 받아 둔 첫 화면. 칩을 바꾸기 전까지 이 값을 그대로 쓴다. */
  readonly initialItems: readonly ProductRankingItemResponse[];
  readonly categories: readonly CategoryResponse[];
};

/** 칩에 세울 카테고리 수. 디자인은 네 개를 보여 준다. */
const CHIP_COUNT = 4;

/** 서버가 최대 여섯 개를 내려 주므로 기다리는 자리도 같은 수로 잡는다. */
const SKELETON_COUNT = 6;

/**
 * 디자인 S01 의 `지금 사람들이 보고 있어요`.
 *
 * 카테고리 칩을 누르면 그 카테고리 안에서 다시 순위를 받아 온다. 서버가 최대 여섯 개를
 * 내려 주므로 3열 2행으로 놓는다.
 */
export function PopularProducts({ initialItems, categories }: PopularProductsProps) {
  const chips = categories.slice(0, CHIP_COUNT);
  /* 고른 카테고리. 아무것도 고르지 않으면 전체다. */
  const [selected, setSelected] = useState<number | null>(null);
  /*
   * 카테고리를 걸었을 때 받아 온 것만 들고 있는다. 어느 조건의 응답인지 함께 두어야
   * 칩을 빠르게 옮겼을 때 늦게 온 응답이 지금 고른 칩의 자리를 덮지 않는다.
   */
  const [loaded, setLoaded] = useState<{
    readonly categoryId: number;
    readonly items: readonly ProductRankingItemResponse[];
  } | null>(null);

  useEffect(() => {
    // 전체는 서버가 이미 준 값을 그대로 쓴다. 다시 받아 오지 않는다.
    if (selected === null) return;

    const controller = new AbortController();
    fetchProductRankings([selected])
      .then((response) => {
        if (!controller.signal.aborted) setLoaded({ categoryId: selected, items: response.items });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [selected]);

  if (initialItems.length === 0) return null;

  /* 아직 이 칩의 응답이 오지 않았으면 이전 목록을 그대로 둔다. 빈 화면이 깜빡이지 않는다. */
  const items = selected === null ? initialItems : loaded?.categoryId === selected ? loaded.items : null;

  const select = (categoryId: number | null) => {
    setSelected(categoryId);
    track("ranking_category_changed", categoryId === null ? {} : { category_id: categoryId });
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[17px] font-bold text-text-primary">지금 사람들이 보고 있어요</h2>

      {chips.length > 0 ? (
        <ul className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {[{ id: null, name: "전체" }, ...chips].map((chip) => {
            const active = selected === chip.id;
            return (
              <li key={chip.id ?? "all"}>
                <button
                  type="button"
                  onClick={() => select(chip.id)}
                  aria-pressed={active}
                  className={[
                    "filter-chip inline-flex h-8 shrink-0 items-center rounded-2xl border px-3 text-[13px] leading-none font-medium",
                    "motion-reduce:transition-none",
                    active
                      ? "border-[#212124] bg-[#212124] font-semibold text-white"
                      : "border-[#DCDEE3] bg-white text-[#212124]",
                  ].join(" ")}
                >
                  {chip.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {items === null ? (
        /* 응답을 기다리는 동안 자리만 잡아 둔다. 아래 목록과 높이가 같아 화면이 튀지 않는다. */
        <ul aria-hidden="true" className="grid grid-cols-3 gap-x-2.5 gap-y-4">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index} className="flex flex-col gap-0.75">
              <span className="h-28 rounded-2xl bg-surface" />
              <span className="h-9.5 rounded bg-surface" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-text-secondary">아직 볼 만한 제품이 모이지 않았어요</p>
      ) : (
        /* 디자인은 열 사이를 10, 행 사이를 16 으로 둔다. 행이 더 벌어져야 두 줄이 갈린다. */
        <ul className="grid grid-cols-3 gap-x-2.5 gap-y-4">
          {items.map(({ product }, index) => (
            <li key={product.id}>
              <Link href={`/products/${product.id}?from=home`} className="flex flex-col gap-0.75">
                <span className="flex h-28 items-center justify-center overflow-hidden rounded-2xl">
                  <Image
                    src={product.imageUrl || PRODUCT_PLACEHOLDER}
                    alt=""
                    width={224}
                    height={224}
                    loading={index < 3 ? "eager" : "lazy"}
                    className="size-full object-contain p-2"
                  />
                </span>

                {/*
                  브랜드와 제품명을 한 덩어리로 읽히게 이어 쓰고 브랜드만 옅게 둔다.
                  두 줄까지만 보여 주고 넘치면 줄임표로 끊는다.
                */}
                <span className="line-clamp-2 text-body leading-[1.35] text-text-primary">
                  <span className="text-text-secondary">{product.brandName}</span> {product.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
