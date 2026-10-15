"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";

import { LevelTag } from "./LevelTag";
import { MatchedText } from "./MatchedText";
import { ProductImage } from "./ProductImage";
import { SaveButton } from "./SaveButton";

import type { ProductEntryPoint } from "@/lib/analytics/events";
import { formatPrice, formatVolumeWithUnitPrice } from "@/lib/domain/format";
import { splitByKeyword } from "@/lib/domain/highlight";

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

  return (
    <article className="bg-white" data-product-card data-product-id={id}>
      <div data-product-content className="flex min-h-27 items-center gap-3 py-3">
        <Link
          href={`/products/${id}${entryPoint ? `?from=${entryPoint}` : ""}`}
          className="flex flex-1 items-center gap-3"
        >
          {/*
            제품 이름을 옆에 적어 두므로 그림에는 대체 텍스트를 비운다. 그림은 제품마다 따로 도착하고,
            칸을 먼저 잡아 두어 늦게 와도 옆의 글이 밀리지 않는다.
          */}
          <ProductImage
            src={product.imageUrl}
            size={80}
            loading={imageLoading}
            data-product-image
            className="shrink-0"
          />

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
    </article>
  );
}
