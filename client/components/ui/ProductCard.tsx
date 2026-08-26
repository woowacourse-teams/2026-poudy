import type { ProductResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";

import { LevelTag } from "./LevelTag";
import { SaveButton } from "./SaveButton";

import type { ProductEntryPoint } from "@/lib/analytics/events";
import { formatPrice, formatVolumeWithUnitPrice } from "@/lib/domain/product-display";

export const PRODUCT_PLACEHOLDER = "/images/products/placeholder.png";

type ProductCardProps = {
  readonly product: ProductResponse;
  readonly saved: boolean;
  readonly onToggleSave: (productId: number) => void;
  readonly entryPoint?: ProductEntryPoint;
};

/** 디자인 C03. 홈·목록·저장함·카테고리·브랜드 화면이 함께 쓴다. */
export function ProductCard({ product, saved, onToggleSave, entryPoint }: ProductCardProps) {
  const { id, name, brand, price, volumeValue, volumeUnit, moistureLevel, oilLevel } = product;

  return (
    <article className="flex items-center gap-3 bg-white py-3">
      <Link
        href={`/products/${id}${entryPoint ? `?from=${entryPoint}` : ""}`}
        className="flex flex-1 items-center gap-3"
      >
        <ProductThumbnail imageUrl={product.imageUrl} />

        {/*
          줄 높이를 좁힌 대신 줄 사이는 넉넉히 벌려, 한 줄씩 또렷하게 끊어 읽히게 한다.

          브랜드명과 제품명만 한 덩어리로 붙여 둔다. 둘은 같은 제품을 가리키는 이름이라
          가격·유수분처럼 따로 읽는 정보와 같은 간격으로 떨어뜨리면 흩어져 보인다.
          gap 은 컨테이너 전체에 걸리므로 이 한 자리만 margin 으로 좁힌다.
        */}
        <div className="flex flex-1 flex-col gap-2">
          <span className="mb-[-4px] text-[12px] leading-tight font-medium text-text-secondary">{brand.name}</span>
          <span className="text-[14px] leading-tight text-text-primary">{name}</span>

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
    </article>
  );
}

/**
 * 제품 이름을 옆에 적어 두므로 그림에는 대체 텍스트를 비운다.
 * 그림이 없는 제품은 디자인의 기본 공병 그림으로 자리를 채운다.
 */
function ProductThumbnail({ imageUrl }: { readonly imageUrl: string }) {
  return (
    <Image
      src={imageUrl || PRODUCT_PLACEHOLDER}
      alt=""
      width={80}
      height={80}
      className="size-20 shrink-0 rounded-lg bg-transparent object-contain"
    />
  );
}
