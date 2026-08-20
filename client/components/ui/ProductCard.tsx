import type { ProductResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";

import { LevelTag } from "./LevelTag";
import { SaveButton } from "./SaveButton";

import { formatPrice, formatVolumeWithUnitPrice } from "@/lib/domain/product-display";

export const PRODUCT_PLACEHOLDER = "/images/products/placeholder.png";

type ProductCardProps = {
  readonly product: ProductResponse;
  readonly saved: boolean;
  readonly onToggleSave: (productId: number) => void;
};

/** 디자인 C03. 홈·목록·저장함·카테고리·브랜드 화면이 함께 쓴다. */
export function ProductCard({ product, saved, onToggleSave }: ProductCardProps) {
  const { id, name, brand, price, volumeValue, volumeUnit, moistureLevel, oilLevel } = product;

  return (
    <article className="flex items-center gap-3 bg-white py-3">
      <Link href={`/products/${id}`} className="flex flex-1 items-center gap-3">
        <ProductThumbnail imageUrl={product.imageUrl} />

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium text-text-secondary">{brand.name}</span>
            <span className="text-[14px] text-text-primary">{name}</span>
          </div>

          <p className="text-[11px] text-text-secondary">
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
