import type { ProductDetailResponse } from "@poudy/api/api.zod";
import Image from "next/image";

import { IngredientList } from "./IngredientList";
import { SaveProductButton } from "./SaveProductButton";

import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
import { LevelTag } from "@/components/ui/LevelTag";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ShareButton } from "@/components/ui/ShareButton";
import { TopBar } from "@/components/ui/TopBar";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { EXCLUDE_CODE_LABELS } from "@/lib/domain/exclude-codes";
import { formatPrice, unitPrice } from "@/lib/domain/product-display";
import { effectColor } from "@/lib/domain/skin-effect-colors";

export const ingredientSummary = (ingredientCount: number, effectNames: readonly string[]): string => {
  const effects = [...new Set(effectNames)].slice(0, 2).map((name) => `${name} 성분`);

  if (effects.length === 0) return `${ingredientCount}개 전성분으로 이루어진 제품이에요.`;
  if (effects.length === 1) return `${ingredientCount}개 전성분을 기준으로, ${effects[0]}을 담은 구성입니다.`;
  return `${ingredientCount}개 전성분을 기준으로, ${effects.join("과 ")}을 함께 담은 구성입니다.`;
};

/** S05 제품 성분 상세. 문구와 구조는 design/v1.pen 을 따른다. */
export function ProductDetail({
  product,
  entryPoint = "direct",
}: {
  readonly product: ProductDetailResponse;
  readonly entryPoint?: ProductEntryPoint;
}) {
  return (
    <>
      <TopBar title="제품 상세" variant="sub" showHome right={<ShareButton />} />
      <TrackView
        event="product_viewed"
        properties={{ product_id: product.id, category: product.categories[0]?.name, entry_point: entryPoint }}
      />

      <main className="flex-1 px-4 pb-10">
        <div className="flex flex-col gap-4 pt-4 pb-3">
          <CategoryPath categories={product.categories} />
        </div>

        <section className="flex flex-col items-center gap-4 pt-2 pb-5">
          <Image
            src={product.imageUrl || PRODUCT_PLACEHOLDER}
            alt=""
            width={184}
            height={184}
            className="size-[184px] object-contain"
            priority
          />

          <div className="flex flex-col items-center gap-2">
            <p className="text-[12px] font-medium text-text-secondary">{product.brand.name}</p>
            <h2 className="text-center text-[20px] font-bold text-text-primary">{product.name}</h2>

            <div className="flex gap-2">
              <LevelTag kind="moisture" level={product.moistureLevel} variant="pill" />
              <LevelTag kind="oil" level={product.oilLevel} variant="pill" />
            </div>
          </div>

          <Variants variants={product.variants} />

          <SaveProductButton productId={product.id} productName={product.name} />
        </section>

        <div className="flex flex-col gap-6 px-4 pb-8">
          <SkinEffectGroups product={product} />
          <IngredientSummary product={product} />
          <Ingredients ingredients={product.ingredients} />
          <Source updatedAt={product.updatedAt} />
        </div>
      </main>
    </>
  );
}

function CategoryPath({ categories }: { readonly categories: ProductDetailResponse["categories"] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="카테고리 경로">
      {/* 경로가 여럿이면 세로로 쌓고, 한 경로 안에서는 한 줄로 이어 적는다. */}
      <ol className="flex flex-col gap-[3px]">
        {categories.map((path) => (
          <li key={path.id} className="flex items-center gap-[5px] text-[12px] text-text-secondary">
            <span>{path.name}</span>
            <Icon name="chevron-right" size={12} />
            <span className="font-semibold">{path.child.name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Variants({ variants }: { readonly variants: ProductDetailResponse["variants"] }) {
  if (variants.length === 0) return null;

  return (
    <section className="w-60">
      <h3 className="sr-only">용량별 가격</h3>
      <ul className="divide-y divide-[#E8E9EC]">
        {variants.map((variant) => {
          const perUnit = unitPrice(variant.price, variant);
          return (
            <li key={variant.id} className="flex h-10 items-center justify-between">
              <span className="text-[13px] font-bold text-[#212124]">
                {variant.volumeValue}
                {variant.volumeUnit}
              </span>
              <span className="flex flex-col items-end gap-px">
                <span className="text-[12px] font-medium text-[#54575C]">정가 {formatPrice(variant.price)}</span>
                {perUnit === undefined ? null : (
                  <span className="text-[10px] text-[#868B94]">
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
    <section className="flex flex-col gap-3 pt-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-bold text-text-primary">성분 분류</h3>
        <p className="text-[12px] text-text-secondary">성분을 특성에 따라 확인해 보세요</p>
      </div>

      <ul>
        {product.skinEffectGroups.map((group) => {
          const color = effectColor(group.code);

          return (
            <li key={group.id} className="flex h-[52px] items-center gap-3 border-b border-border last:border-b-0">
              <span
                className={`flex h-[30px] w-[80px] shrink-0 items-center justify-center rounded-[15px] text-[12px] font-bold ${color.bg} ${color.text}`}
              >
                {group.name}
              </span>
              <span className="flex-1 text-[13px] font-semibold text-[#202124]">
                {group.ingredientIds.map(nameOf).filter(Boolean).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 무첨가 태그와 성분 요약. 디자인은 회색 박스 안에 담는다. */
function IngredientSummary({ product }: { readonly product: ProductDetailResponse }) {
  return (
    <section className="relative isolate flex flex-col gap-3 py-4 before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:rounded-xl before:bg-surface-subtle before:content-['']">
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-bold text-[#202124]">성분 정보</h3>
        <p className="text-pretty text-[12px] text-[#72747A]">
          {ingredientSummary(
            product.ingredients.length,
            product.skinEffectGroups.map((group) => group.name),
          )}
        </p>
      </div>

      {product.freeOfCodes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {product.freeOfCodes.map((code) => (
            <li key={code} className="flex h-7 items-center gap-1 rounded-[14px] bg-[#FFF0F4] px-2.5">
              {/* 획 굵기는 고른 네모(CheckMark)의 체크와 맞춘다. */}
              <Icon name="check" size={12} strokeWidth={4} className="text-[#F04465]" />
              <span className="text-[12px] font-semibold text-[#54575C]">{EXCLUDE_CODE_LABELS[code]}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="flex items-start gap-2 border-t border-[#E5E7EB] pt-3">
        <Icon name="info" size={16} className="shrink-0 text-[#72747A]" />
        <span className="text-pretty text-[11px] text-[#72747A]">
          ‘없음’ 표시는 공개된 전성분표에서 해당 성분명이 {"확인되지\u00a0않는다는\u00a0뜻이에요."}
        </span>
      </p>
    </section>
  );
}

function Ingredients({ ingredients }: { readonly ingredients: ProductDetailResponse["ingredients"] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-bold text-[#202124]">전체 성분표</h3>
        <p className="text-[12px] text-[#72747A]">표기 순서대로 전성분을 보여드려요</p>
      </div>

      <IngredientList ingredients={ingredients} />
    </section>
  );
}

function Source({ updatedAt }: { readonly updatedAt: string }) {
  const date = new Date(updatedAt)
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "")
    .replace(/\. /g, ".");

  return (
    <section className="relative isolate flex gap-3 py-4 before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:rounded-xl before:bg-surface-subtle before:content-['']">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-[#E8F5F0]">
        <Icon name="badge-check" size={16} className="text-[#2C9A72]" />
      </span>

      <span className="flex flex-1 flex-col gap-2.5">
        <span className="text-[14px] font-bold text-[#202124]">상품 정보 출처 안내</span>
        <span className="text-pretty text-[12px] text-[#5F6268]">
          브랜드 공식 전성분을 기준으로 정리했어요. {"제품\u00a0리뉴얼에\u00a0따라"} 실제 표기와 다를 수 있어요.
        </span>
        <span className="text-[10px] text-[#8B8D94]">정보 업데이트 · {date}</span>
        {/* 정보 수정 제안은 받을 곳이 아직 없어 화면에서 감춘다. */}
      </span>
    </section>
  );
}
