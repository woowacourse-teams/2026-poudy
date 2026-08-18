import type { ProductDetailResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";

import { SaveProductButton } from "./SaveProductButton";

import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
import { LevelTag } from "@/components/ui/LevelTag";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { TopBar } from "@/components/ui/TopBar";
import { EXCLUDE_CODE_LABELS } from "@/lib/domain/exclude-codes";
import { formatPrice, unitPrice } from "@/lib/domain/product-display";

/** S05 제품 성분 상세. 문구와 구조는 design/v1.pen 을 따른다. */
export function ProductDetail({ product }: { readonly product: ProductDetailResponse }) {
  return (
    <>
      <TopBar title="제품 상세" variant="sub" />
      <TrackView
        event="product_viewed"
        properties={{ product_id: product.id, category: product.categories[0]?.name }}
      />

      <main className="flex-1 pb-10">
        <CategoryPath categories={product.categories} />

        <section className="flex flex-col items-center gap-3 px-4 pb-5">
          <Image
            src={product.imageUrl || PRODUCT_PLACEHOLDER}
            alt=""
            width={140}
            height={140}
            className="size-[140px] rounded-2xl bg-surface object-contain"
            priority
          />
          <p className="text-[12px] font-medium text-text-secondary">{product.brand.name}</p>
          <h2 className="text-center text-[22px] font-bold text-text-primary">{product.name}</h2>

          <div className="flex gap-3">
            <LevelTag kind="moisture" level={product.moistureLevel} />
            <LevelTag kind="oil" level={product.oilLevel} />
          </div>
        </section>

        <Variants variants={product.variants} />

        <div className="px-4 py-4">
          <SaveProductButton productId={product.id} productName={product.name} />
        </div>

        <SkinEffectGroups product={product} />
        <IngredientSummary product={product} />
        <Ingredients ingredients={product.ingredients} />
        <Source updatedAt={product.updatedAt} />
      </main>
    </>
  );
}

function CategoryPath({ categories }: { readonly categories: ProductDetailResponse["categories"] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="카테고리 경로" className="px-4 py-3">
      <ol className="flex flex-wrap items-center gap-1 text-[12px]">
        {categories.map((path) => (
          <li key={path.id} className="flex items-center gap-1">
            <span className="text-text-secondary">{path.name}</span>
            {path.child ? (
              <>
                <Icon name="chevron-right" size={12} className="text-text-secondary" />
                <span className="font-semibold text-text-primary">{path.child.name}</span>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Variants({ variants }: { readonly variants: ProductDetailResponse["variants"] }) {
  if (variants.length === 0) return null;

  return (
    <section className="px-4">
      <h3 className="sr-only">용량별 가격</h3>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {variants.map((variant) => {
          const perUnit = unitPrice(variant.price, variant);
          return (
            <li key={variant.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] font-bold text-text-primary">
                {variant.volumeValue}
                {variant.volumeUnit}
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-[12px] font-medium text-text-primary">정가 {formatPrice(variant.price)}</span>
                {perUnit === undefined ? null : (
                  <span className="text-[10px] text-text-secondary">
                    정가 기준 {perUnit.toLocaleString("ko-KR")}원/{variant.volumeUnit}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SkinEffectGroups({ product }: { readonly product: ProductDetailResponse }) {
  if (product.skinEffectGroups.length === 0) return null;

  const nameOf = (id: number) => product.ingredients.find((ingredient) => ingredient.id === id)?.koreanName;

  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <h3 className="text-[18px] font-bold text-text-primary">주요 기능</h3>
      <p className="mt-1 text-[12px] text-text-secondary">효과별로 관련 성분을 묶어 보여드려요</p>

      <ul className="mt-4 flex flex-col gap-3">
        {product.skinEffectGroups.map((group) => (
          <li key={group.id} className="flex items-start gap-3">
            <span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-[10px] font-bold text-brand">
              {group.name}
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-medium text-text-secondary">관련 성분</span>
              <span className="text-[13px] font-semibold text-text-primary">
                {group.ingredientIds.map(nameOf).filter(Boolean).join(" · ")}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 무첨가 태그와 한눈에 요약. */
function IngredientSummary({ product }: { readonly product: ProductDetailResponse }) {
  const effects = [...new Set(product.skinEffectGroups.slice(0, 2).map((group) => `${group.name} 성분`))].join("과 ");

  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[18px] font-bold text-text-primary">성분 정보</h3>
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">한눈에</span>
      </div>

      <p className="mt-2 text-[12px] text-text-secondary">
        {product.ingredients.length}개 전성분을 기준으로, {effects}을 함께 담은 구성입니다.
      </p>

      {product.freeOfCodes.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {product.freeOfCodes.map((code) => (
            <li
              key={code}
              className="flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-2 text-[11px] font-semibold text-success"
            >
              <Icon name="check" size={12} />
              {EXCLUDE_CODE_LABELS[code]}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[11px] text-text-secondary">
        ‘없음’ 표시는 공개된 전성분표에서 해당 성분명이 확인되지 않는다는 뜻이에요.
      </p>
    </section>
  );
}

function Ingredients({ ingredients }: { readonly ingredients: ProductDetailResponse["ingredients"] }) {
  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <h3 className="text-[18px] font-bold text-text-primary">전체 성분표</h3>
      <p className="mt-1 text-[12px] text-text-secondary">표기 순서대로 전성분을 보여드려요</p>

      <ol className="mt-4 flex flex-col">
        {ingredients.map((ingredient, index) => (
          <li key={ingredient.id}>
            <Link
              href={`/ingredients/${ingredient.id}`}
              className="flex items-center gap-3 border-b border-border py-3"
            >
              <span className="w-6 shrink-0 font-data text-[10px] text-text-secondary">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-text-primary">{ingredient.koreanName}</span>
                <span className="text-[10px] text-text-secondary">
                  {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
                </span>
              </span>

              <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-text-secondary">
                {ingredient.skinEffects[0]?.name ?? "일반"}
              </span>

              <Icon name="chevron-right" size={16} className="text-text-secondary" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Source({ updatedAt }: { readonly updatedAt: string }) {
  const date = new Date(updatedAt)
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "")
    .replace(/\. /g, ".");

  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <h3 className="text-[14px] font-bold text-text-primary">상품 정보 출처 안내</h3>
      <p className="mt-1 text-[12px] text-text-secondary">
        브랜드 공식 전성분을 기준으로 정리했어요. 제품 리뉴얼에 따라 실제 표기와 다를 수 있어요.
      </p>
      <p className="mt-2 text-[10px] text-text-secondary">정보 업데이트 · {date}</p>
      <p className="mt-2 text-[11px] font-semibold text-text-secondary">정보 수정 제안 ›</p>
    </section>
  );
}
