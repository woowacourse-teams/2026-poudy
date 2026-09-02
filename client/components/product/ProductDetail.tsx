import type { ProductDetailResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";

import { IngredientList } from "./IngredientList";
import { ProductDetailHeader, ProductSummaryEnd } from "./ProductDetailHeader";
import { SaveProductButton } from "./SaveProductButton";

import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
import { LevelTag } from "@/components/ui/LevelTag";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ShareButton } from "@/components/ui/ShareButton";
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
    <ProductDetailHeader title="제품 상세" right={<ShareButton />} summary={<CompactSummary product={product} />}>
      <TrackView
        event="product_viewed"
        properties={{ product_id: product.id, category: product.categories[0]?.name, entry_point: entryPoint }}
      />

      <main className="flex-1 px-4">
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
            <Link
              href={`/brands/${product.brand.id}`}
              aria-label={`${product.brand.name} 브랜드관`}
              className="-my-1.5 py-1.5 text-[12px] font-medium text-text-secondary active:opacity-60"
            >
              {product.brand.name}
            </Link>
            <h2 className="text-center text-[20px] font-bold text-text-primary">{product.name}</h2>

            <div className="flex gap-2">
              <LevelTag kind="moisture" level={product.moistureLevel} variant="pill" />
              <LevelTag kind="oil" level={product.oilLevel} variant="pill" />
            </div>
          </div>

          <Variants variants={product.variants} />

          <SaveProductButton productId={product.id} productName={product.name} />
        </section>

        <ProductSummaryEnd />

        <div className="flex flex-col gap-6 px-4 pb-4">
          <SkinEffectGroups product={product} />
          <IngredientSummary product={product} />
          <Ingredients ingredients={product.ingredients} />
          <Source updatedAt={product.updatedAt} />
        </div>
      </main>
    </ProductDetailHeader>
  );
}

/**
 * 머리에 붙는 축약형. 원래 배치와 같은 것을 담되 가로로 접는다.
 *
 * 세로로 쌓인 원래 배치를 그대로 붙이면 화면 절반을 차지해 본문을 읽을 자리가 남지 않는다.
 * 그림을 줄이고, 이름은 한 줄로 줄이고, 용량별 가격은 가장 싼 것 하나로 접는다.
 */
function CompactSummary({ product }: { readonly product: ProductDetailResponse }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/*
        원래 배치와 같은 크기로 받아 보여 줄 때만 줄인다. 40px 로 새로 받으면
        같은 그림을 한 번 더 내려받게 된다.

        옆 글(제품명·유수분 두 줄)이 차지하는 높이에 맞춘다. 그림에 높이를 재게 두면 그 높이가
        줄을 다시 늘려 끝없이 커지므로, 자라는 쪽을 글로 정해 두고 그림은 그 값을 받아 쓴다.
      */}
      <Image
        src={product.imageUrl || PRODUCT_PLACEHOLDER}
        alt=""
        width={184}
        height={184}
        className="size-[42px] shrink-0 object-contain"
      />

      {/*
        글자 크기와 줄 높이는 `ProductCard` 를 따른다. 같은 제품을 같은 방식으로 읽게 두어야
        목록에서 상세로 들어와도 눈이 다시 적응하지 않는다. 브랜드명은 제품명 위가 아니라 앞에
        붙이고, 값은 적지 않는다. 머리는 지금 보는 제품이 무엇인지만 알려 주면 된다.
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* 이름이 길면 여기서 줄인다. 붙은 채로 두 줄이 되면 머리가 본문을 덮는다. */}
        <p className="truncate text-[14px] leading-tight text-text-primary">
          <span className="pr-1 text-[12px] leading-tight font-medium text-text-secondary">{product.brand.name}</span>
          {product.name}
        </p>

        <div className="flex items-center gap-2">
          <LevelTag kind="moisture" level={product.moistureLevel} />
          <LevelTag kind="oil" level={product.oilLevel} />
        </div>
      </div>

      <SaveProductButton productId={product.id} productName={product.name} variant="icon" />
    </div>
  );
}

/*
 * 12px 글자는 그대로 두면 누를 자리가 24px 에 못 미친다. 위아래로 여백을 주어 손이 닿을 자리를
 * 넓히고, 같은 크기의 음수 바깥 여백으로 되돌려 경로가 차지하는 높이는 그대로 둔다.
 *
 * 가만히 있을 때의 모습은 원래 배치 그대로 두고, 손이 닿는 동안에만 옅어져 눌린 것을 알린다.
 */
const LINK = "-my-1.5 py-1.5 active:opacity-60";

function CategoryPath({ categories }: { readonly categories: ProductDetailResponse["categories"] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="카테고리 경로">
      {/* 경로가 여럿이면 세로로 쌓고, 한 경로 안에서는 한 줄로 이어 적는다. */}
      <ol className="flex flex-col gap-[3px]">
        {categories.map((path) => (
          <li key={path.id} className="flex items-center gap-[5px] text-[12px] text-text-secondary">
            <Link href={`/categories/${path.id}`} aria-label={`${path.name} 카테고리 제품`} className={LINK}>
              {path.name}
            </Link>
            <Icon name="chevron-right" size={12} />
            <Link
              href={`/categories/${path.child.id}`}
              aria-label={`${path.child.name} 카테고리 제품`}
              className={`${LINK} font-semibold`}
            >
              {path.child.name}
            </Link>
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
