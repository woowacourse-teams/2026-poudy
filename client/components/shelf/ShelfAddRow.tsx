import type { ProductSuggestionResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";

import { productImageSrc } from "./product-image-src";

import { ProductImage } from "@/components/ui/ProductImage";
import { splitByKeyword, splitByRange } from "@/lib/domain/highlight";
import { USAGE_LABEL } from "@/lib/domain/shelf";

type ShelfAddRowProps = {
  readonly product: ProductSuggestionResponse;
  readonly keyword: string;
  /** 이미 선반에 있으면 그 사용 상태. 없으면 비운다. */
  readonly shelved?: ShelfUsageStatus;
};

const nameParts = (product: ProductSuggestionResponse, keyword: string) =>
  product.match.field === "PRODUCT_NAME" ? splitByRange(product.match) : splitByKeyword(product.name, keyword);

/**
 * 제품 추가 행(명세 APP · 제품 추가 행 · 자동완성 · 담김). 검색어와 맞는 자리를 굵게 쓴다.
 * 이미 선반에 있으면 흐리게 그리고 브랜드 옆에 사용 상태를, 오른쪽에 '선반에 있음'을 둔다.
 *
 * 행 전체가 자동완성 후보(option)라 오른쪽 '추가'는 버튼이 아니라 표시만 한다. 후보 안에 버튼을 두면 낭독기가
 * 후보 하나를 두 번 읽고, 키보드로는 버튼에 닿을 수 없다(보고의 명세 판단 참고).
 */
export function ShelfAddRow({ product, keyword, shelved }: ShelfAddRowProps) {
  const dimmed = shelved !== undefined;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-14 shrink-0 items-center justify-center p-0.5">
        <ProductImage src={productImageSrc(product.imageUrl)} alt="" size={52} className="size-full object-contain" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn("line-clamp-2 text-title", dimmed ? "text-text-muted" : "text-text-primary")}>
          <span className="sr-only">{product.name}</span>
          <span aria-hidden="true">
            {nameParts(product, keyword).map((part, index) => (
              <span key={index} className={cn(part.matched && "font-bold")}>
                {part.text}
              </span>
            ))}
          </span>
        </p>
        <p className="flex items-center gap-0.5 text-caption">
          <span className={cn("truncate", dimmed ? "text-text-muted" : "text-text-secondary")}>
            {product.brandName}
          </span>
          {shelved ? (
            <>
              <span aria-hidden="true" className="text-text-muted">
                ·
              </span>
              <span className="shrink-0 font-semibold text-text-secondary">{USAGE_LABEL[shelved]}</span>
            </>
          ) : null}
        </p>
      </div>

      {shelved ? (
        <span className="shrink-0 text-body-sm font-semibold text-text-muted">선반에 있음</span>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-8 shrink-0 items-center rounded-xl border border-border-strong bg-background px-3 text-13 leading-none font-semibold text-text-primary"
        >
          추가
        </span>
      )}
    </div>
  );
}
