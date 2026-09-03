"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useCallback, useState } from "react";

import { LevelTag } from "./LevelTag";
import { MatchedText } from "./MatchedText";
import { PRODUCT_PLACEHOLDER, ProductThumbnail } from "./ProductThumbnail";
import { SaveButton } from "./SaveButton";

import type { ProductEntryPoint } from "@/lib/analytics/events";
import { splitByKeyword } from "@/lib/domain/highlight";
import { formatPrice, formatVolumeWithUnitPrice } from "@/lib/domain/product-display";

// 제품 상세와 검색 패널이 같은 기본 그림을 쓴다. 들여오던 자리를 그대로 둔다.
export { PRODUCT_PLACEHOLDER } from "./ProductThumbnail";

type ProductCardProps = {
  readonly product: ProductResponse;
  readonly saved: boolean;
  readonly onToggleSave: (productId: number) => void;
  readonly entryPoint?: ProductEntryPoint;
  /** 첫 화면의 LCP 후보만 즉시 받고, 나머지 카드는 지연해서 받는다. */
  readonly imageLoading?: "eager" | "lazy";
  /** 찾은 말. 주면 이름에서 맞는 자리를 색으로 가른다. */
  readonly keyword?: string;
};

/** 디자인 C03. 홈·목록·저장함·카테고리·브랜드 화면이 함께 쓴다. */
export function ProductCard({
  product,
  saved,
  onToggleSave,
  entryPoint,
  imageLoading = "lazy",
  keyword = "",
}: ProductCardProps) {
  const { id, name, brand, price, volumeValue, volumeUnit, moistureLevel, oilLevel } = product;
  const imageSource = product.imageUrl || PRODUCT_PLACEHOLDER;
  // 같은 주소를 쓰는 제품도 서로의 완료 상태를 공유하지 않도록 제품 ID까지 묶는다.
  const imageLoadKey = `${id}:${imageSource}`;
  const [settledImage, setSettledImage] = useState<string>();
  const imageSettled = settledImage === imageLoadKey;
  const settleImage = useCallback(() => setSettledImage(imageLoadKey), [imageLoadKey]);

  return (
    <article
      className="relative bg-white"
      aria-busy={!imageSettled}
      data-product-card
      data-image-state={imageSettled ? "loaded" : "loading"}
      data-product-id={id}
      suppressHydrationWarning
    >
      <div data-product-content className="flex items-center gap-3 py-3">
        <Link
          href={`/products/${id}${entryPoint ? `?from=${entryPoint}` : ""}`}
          className="flex flex-1 items-center gap-3"
        >
          <ProductThumbnail imageUrl={product.imageUrl} loading={imageLoading} onSettled={settleImage} />

          {/*
          줄 높이를 좁힌 대신 줄 사이는 넉넉히 벌려, 한 줄씩 또렷하게 끊어 읽히게 한다.

          브랜드명과 제품명만 한 덩어리로 붙여 둔다. 둘은 같은 제품을 가리키는 이름이라
          가격·유수분처럼 따로 읽는 정보와 같은 간격으로 떨어뜨리면 흩어져 보인다.
          gap 은 컨테이너 전체에 걸리므로 이 한 자리만 margin 으로 좁힌다.
        */}
          <div className="flex flex-1 flex-col gap-2">
            <span className="mb-[-4px] text-[12px] leading-tight font-medium">
              <MatchedText
                label={brand.name}
                parts={splitByKeyword(brand.name, keyword)}
                plainClassName="text-text-secondary"
                dimmedClassName="text-text-secondary"
                matchedClassName="text-brand-strong"
              />
            </span>
            <span className="text-[14px] leading-tight">
              <MatchedText
                label={name}
                parts={splitByKeyword(name, keyword)}
                plainClassName="text-text-primary"
                dimmedClassName="text-text-primary"
                matchedClassName="text-brand-strong"
              />
            </span>

            <p className="text-[11px] leading-tight text-text-secondary">
              {formatPrice(price)} · {formatVolumeWithUnitPrice(price, { volumeValue, volumeUnit })}
            </p>

            <div className="flex items-center gap-2">
              <LevelTag kind="moisture" level={moistureLevel} />
              <LevelTag kind="oil" level={oilLevel} />
            </div>
          </div>
        </Link>

        <SaveButton productName={name} saved={saved} onToggle={() => onToggleSave(id)} />
      </div>

      <ProductCardSkeleton />
    </article>
  );
}

/** 한 제품의 이미지와 텍스트가 함께 준비되는 동안 그 카드 자리만 가린다. */
function ProductCardSkeleton() {
  return (
    <div data-product-skeleton aria-hidden="true" className="absolute inset-0 z-10 bg-white">
      <div className="flex h-full animate-pulse items-center gap-3 py-3">
        <div className="size-20 shrink-0 rounded-lg bg-[#F2F3F5]" />

        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-16 rounded bg-[#EDEEF0]" />
          <div className="h-4 w-3/4 rounded bg-[#EDEEF0]" />
          <div className="h-3 w-1/2 rounded bg-[#EDEEF0]" />
          <div className="flex gap-2">
            <div className="h-5 w-14 rounded bg-[#F2F3F5]" />
            <div className="h-5 w-14 rounded bg-[#F2F3F5]" />
          </div>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center">
          <div className="size-5 rounded bg-[#F2F3F5]" />
        </div>
      </div>
    </div>
  );
}
