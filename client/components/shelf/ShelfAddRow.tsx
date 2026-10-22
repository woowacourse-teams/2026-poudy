import type { ShelfProductSuggestionResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";

import { ProductImage } from "@/components/ui/ProductImage";
import { splitByKeyword, splitByRange } from "@/lib/domain/highlight";

/**
 * 행 오른쪽의 상태.
 * - add: 아직 선반에 없다. 누르면 담는다.
 * - justAdded: 이번 방문에 방금 담았다. 누르면 바로 뺀다(S52j-1).
 * - shelved: 전부터 선반에 있었다. 누를 수 없다.
 */
export type ShelfAddRowState = "add" | "justAdded" | "shelved";

type ShelfAddRowProps = {
  readonly product: ShelfProductSuggestionResponse;
  readonly keyword: string;
  readonly state: ShelfAddRowState;
};

const nameParts = (product: ShelfProductSuggestionResponse, keyword: string) =>
  product.match.field === "PRODUCT_NAME" ? splitByRange(product.match) : splitByKeyword(product.name, keyword);

/**
 * 제품 추가 행(명세 APP · 제품 추가 행 · 자동완성 · 담김 · 방금 담음). 브랜드 → 제품명 순서이고, 검색어와 맞는 자리를 굵게 쓴다.
 * 전부터 선반에 있던 제품은 흐리게 그리고 오른쪽에 '선반에 있음'을 둔다.
 *
 * 행 전체가 자동완성 후보(option)라 오른쪽 '추가' · '담김'은 버튼이 아니라 표시만 한다. 후보 안에 버튼을 두면 낭독기가
 * 후보 하나를 두 번 읽고, 키보드로는 버튼에 닿을 수 없다. 후보를 고르면 담거나(추가) 바로 뺀다(담김).
 */
export function ShelfAddRow({ product, keyword, state }: ShelfAddRowProps) {
  const dimmed = state === "shelved";

  return (
    <div className="flex items-center gap-3 border-b border-border py-2">
      <div className="flex size-14 shrink-0 items-center justify-center p-2">
        <ProductImage src={product.imageUrl} size={40} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "truncate text-caption leading-snug font-medium",
            dimmed ? "text-text-muted" : "text-text-secondary",
          )}
        >
          {product.brandName}
        </p>
        <p className={cn("line-clamp-2 text-title leading-snug", dimmed ? "text-text-muted" : "text-text-primary")}>
          <span className="sr-only">{product.name}</span>
          <span aria-hidden="true">
            {nameParts(product, keyword).map((part, index) => (
              <span key={index} className={cn(part.matched && "font-bold")}>
                {part.text}
              </span>
            ))}
          </span>
        </p>
      </div>

      {state === "shelved" ? (
        <span className="shrink-0 text-body-sm font-semibold text-text-muted">선반에 있음</span>
      ) : null}
      {state === "justAdded" ? (
        // 회색 채움으로 '담김'을 [추가]의 테두리와 구분한다. 폭이 [추가]와 거의 같아 바뀌어도 버튼이 늘었다 줄지 않는다.
        <span className="flex h-8 shrink-0 items-center rounded-xl bg-button-secondary px-3 text-body-sm leading-none font-semibold text-text-primary">
          담김
          <span className="sr-only">, 누르면 선반에서 빼기</span>
        </span>
      ) : null}
      {state === "add" ? (
        <span
          aria-hidden="true"
          className="flex h-8 shrink-0 items-center rounded-xl border border-border-strong bg-background px-3 text-body-sm leading-none font-semibold text-text-primary"
        >
          추가
        </span>
      ) : null}
    </div>
  );
}
