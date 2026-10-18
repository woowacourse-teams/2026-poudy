"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { LevelTag } from "./LevelTag";
import { MatchedText } from "./MatchedText";
import { ProductImage } from "./ProductImage";
import { SaveButton } from "./SaveButton";

import type { ProductEntryPoint } from "@/lib/analytics/events";
import { formatPrice, formatVolumeWithUnitPrice } from "@/lib/domain/format";
import { splitByKeyword } from "@/lib/domain/highlight";

/** 스크롤 목록의 행이라 눌림을 조금 늦게 켠다. 스크롤하며 스친 카드가 깜박이지 않는다(STATE S05). */
const ROW_PRESS_DELAY_MS = 80;

type ProductCardProps = {
  readonly product: ProductResponse;
  readonly entryPoint?: ProductEntryPoint;
  /** 첫 화면의 LCP 후보만 즉시 받고, 나머지 카드는 지연해서 받는다. */
  readonly imageLoading?: "eager" | "lazy";
  /** 찾은 말. 주면 이름에서 맞는 자리를 색으로 가른다. */
  readonly keyword?: string;
  /**
   * 위시리스트가 아직 쓰는 저장 버튼. 명세(r4q5g)의 카드에는 저장 버튼이 없고 저장은 제품 상세에서만 한다.
   * 위시리스트를 개편하면(#739) 이 자리를 지운다.
   */
  readonly save?: { readonly saved: boolean; readonly onToggle: (productId: number) => void };
};

/**
 * 상품 목록 카드(명세 APP · 상품 목록 카드 r4q5g, 회의 10/12 결정안 O1IvH).
 * 조건 일치 제품·카테고리 상품·브랜드 상세·위시리스트가 함께 쓴다.
 *
 * 읽는 순서는 브랜드 → 제품명 → 사용감 → 가격·용량·단가다. 카드 전체가 제품 상세로 가는 링크다.
 *
 * hover(마우스 기기)와 눌림은 목록 행 규칙(STATE S04)을 따라 화면 끝에서 끝까지 ui-hover 면을 깐다(fb-bleed). 카드는 거터
 * 안쪽에 놓이므로 면은 가상 요소로 거터만큼 양옆에 넓혀 그린다. 레이아웃 크기와 구분선 자리는 그대로다.
 */
export function ProductCard({ product, entryPoint, imageLoading = "lazy", keyword = "", save }: ProductCardProps) {
  const { id, name, brand, price, volumeValue, volumeUnit, moistureLevel, oilLevel } = product;
  const { pressableProps } = usePressable({ delayMs: ROW_PRESS_DELAY_MS });

  return (
    <article className="relative flex items-center border-b border-border" data-product-card data-product-id={id}>
      <Link
        href={`/products/${id}${entryPoint ? `?from=${entryPoint}` : ""}`}
        {...pressableProps}
        data-product-content
        className="pressable fb-bleed flex min-w-0 flex-1 items-center gap-3 py-3"
      >
        {/* 제품 이름을 옆에 적어 두므로 그림에는 대체 텍스트를 비운다(A11Y D05). 칸을 먼저 잡아 늦게 와도 글이 밀리지 않는다. */}
        <ProductImage
          src={product.imageUrl}
          size={80}
          loading={imageLoading}
          data-product-image
          className="shrink-0 mix-blend-multiply"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-caption font-medium">
              <MatchedText
                label={brand.name}
                parts={splitByKeyword(brand.name, keyword)}
                plainClassName="text-text-secondary"
                dimmedClassName="text-text-secondary"
                matchedClassName="text-brand-strong"
              />
            </span>
            <span data-product-name className="line-clamp-2 text-title font-medium">
              <MatchedText
                label={name}
                parts={splitByKeyword(name, keyword)}
                plainClassName="text-text-primary"
                dimmedClassName="text-text-primary"
                matchedClassName="text-brand-strong"
              />
            </span>
          </div>

          {/* 좁은 화면이나 큰 글자에서 두 레벨이 한 줄에 들어가지 않으면 유분감을 다음 줄로 내린다.
              향수·클렌징처럼 유수분 정보가 없는 제품은 줄을 두지 않는다(#814). */}
          {moistureLevel !== null || oilLevel !== null ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <LevelTag kind="moisture" level={moistureLevel} />
              <LevelTag kind="oil" level={oilLevel} />
            </div>
          ) : null}

          <p className="text-caption text-text-muted">
            {formatPrice(price)} · {formatVolumeWithUnitPrice(price, { volumeValue, volumeUnit })}
          </p>
        </div>
      </Link>

      {save ? <SaveButton productName={name} saved={save.saved} onToggle={() => save.onToggle(id)} /> : null}
    </article>
  );
}
