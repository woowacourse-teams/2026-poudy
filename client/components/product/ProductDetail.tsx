import type {
  ExcludeCodeResponse,
  ProductDetailResponse,
  ProductPartResponse,
  SimilarProductResponse,
} from "@poudy/api/api.zod";
import Link from "next/link";

import { CautionCheck } from "./CautionCheck";
import { IngredientList } from "./IngredientList";
import { PartTabs } from "./PartTabs";
import { ProductViewRecorder } from "./ProductViewRecorder";
import { SaveProductButton } from "./SaveProductButton";
import { SimilarProducts } from "./SimilarProducts";
import { UsageIngredients } from "./UsageIngredients";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
import { LevelTag } from "@/components/ui/LevelTag";
import { PRESS_TEXT } from "@/components/ui/press";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { ShareButton } from "@/components/ui/ShareButton";
import { SummaryEnd, SummaryHeader } from "@/components/ui/SummaryHeader";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { withCautionCodes } from "@/lib/domain/caution-check";
import { formatPrice, unitPrice } from "@/lib/domain/product-display";
import { partTabId } from "@/lib/domain/product-parts";

/** S24 제품 성분 상세. 문구와 구조는 design/v2.pen 을 따른다. */
export function ProductDetail({
  product,
  entryPoint = "direct",
  similarProducts = [],
  excludeCodes = [],
}: {
  readonly product: ProductDetailResponse;
  readonly entryPoint?: ProductEntryPoint;
  /** 고른 구성품과 성분이 비슷한 제품. 비어 있으면 섹션을 그리지 않는다. */
  readonly similarProducts?: readonly SimilarProductResponse[];
  /** 주의 성분 기준의 성분군 코드를 찾는 제외 성분군 목록. 비어 있으면 기준을 누를 수 없게 둔다. */
  readonly excludeCodes?: readonly ExcludeCodeResponse[];
}) {
  return (
    <SummaryHeader
      title="제품 상세"
      right={<ShareButton />}
      summary={<CompactSummary product={product} entryPoint={entryPoint} />}
    >
      <TrackView
        event="product_viewed"
        properties={{ product_id: product.id, category: product.categories[0]?.name, entry_point: entryPoint }}
      />
      <ProductViewRecorder productId={product.id} />
      <TrackActiveTime pageType="product_detail" entityId={product.id} />

      {/*
        간격은 design/v2.pen 의 auto layout 을 그대로 옮긴다. 형제 사이는 부모의 gap 으로 띄우고,
        padding 은 화면 가장자리(좌우 16, 위 16, 아래 40)에만 둔다. 자식에 여백을 붙여 간격을 만들지 않는다.
      */}
      <main className="flex flex-1 flex-col">
        {/* 카테고리 경로 → 제품 요약 24, 제품 요약 → 저장 버튼 36 */}
        <div className="flex flex-col gap-6 px-4 pt-4 pb-3">
          <CategoryPath categories={product.categories} />

          <div className="flex flex-col gap-9">
            <section className="flex flex-col items-center gap-4">
              <ProductImage
                src={product.imageUrl || PRODUCT_PLACEHOLDER}
                alt={product.imageUrl ? `${product.brand.name} ${product.name} 제품 이미지` : "제품 이미지"}
                size={184}
                className="size-[184px] object-contain"
                loading="eager"
              />

              <div className="flex w-full flex-col items-center gap-2">
                <Link
                  href={`/brands/${product.brand.id}`}
                  aria-label={`${product.brand.name} 브랜드관`}
                  className={`${LINK} text-[12px] font-medium text-[#566273]`}
                >
                  {product.brand.name}
                </Link>
                <h1 className="text-center text-[20px] leading-[1.15] font-bold text-[#182132]">{product.name}</h1>

                <div className="flex gap-2">
                  <LevelTag kind="moisture" level={product.moistureLevel} />
                  <LevelTag kind="oil" level={product.oilLevel} />
                </div>

                <Variants variants={product.variants} />
              </div>
            </section>

            {/*
              축약형은 저장 버튼이 머리 밑으로 들어가는 순간 나타난다. 축약형에도 저장 단추가 있어
              큰 버튼을 그대로 이어받는다. 표식과 구성품 탭 사이가 60px 이라 탭이 붙기 전에
              축약형이 먼저 나와 있고, 탭을 바꿔 패널로 올려도 축약형이 그대로 남는다.
              표식과 버튼 사이에 gap 이 끼지 않게 한 묶음에 둔다.
            */}
            <div className="flex flex-col">
              <SummaryEnd />
              <SaveProductButton productId={product.id} productName={product.name} entryPoint={entryPoint} />
            </div>
          </div>
        </div>

        {/* 저장 버튼 바로 아래에 두고, 내려가면 머리에 붙는다. */}
        <PartTabs product={product} entryPoint={entryPoint} />

        <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
          <SelectedPart product={product} similarProducts={similarProducts} excludeCodes={excludeCodes} />
          <Source updatedAt={product.updatedAt} productId={product.id} />
        </div>
      </main>
    </SummaryHeader>
  );
}

/**
 * 머리에 붙는 축약형. 원래 배치와 같은 것을 담되 가로로 접는다.
 *
 * 세로로 쌓인 원래 배치를 그대로 붙이면 화면 절반을 차지해 본문을 읽을 자리가 남지 않는다.
 * 그림을 줄이고, 이름은 한 줄로 줄이고, 용량별 가격은 가장 싼 것 하나로 접는다.
 */
function CompactSummary({
  product,
  entryPoint,
}: {
  readonly product: ProductDetailResponse;
  readonly entryPoint: ProductEntryPoint;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/*
        원래 배치와 같은 크기로 받아 보여 줄 때만 줄인다. 40px 로 새로 받으면
        같은 그림을 한 번 더 내려받게 된다.

        옆 글(제품명·유수분 두 줄)이 차지하는 높이에 맞춘다. 그림에 높이를 재게 두면 그 높이가
        줄을 다시 늘려 끝없이 커지므로, 자라는 쪽을 글로 정해 두고 그림은 그 값을 받아 쓴다.
      */}
      <ProductImage
        src={product.imageUrl || PRODUCT_PLACEHOLDER}
        alt=""
        size={42}
        loading="lazy"
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

      <SaveProductButton productId={product.id} productName={product.name} variant="icon" entryPoint={entryPoint} />
    </div>
  );
}

/*
 * 12px 글자는 그대로 두면 누를 자리가 24px 에 못 미친다. 글자 위아래로 6px 씩 겹쳐 그린 가상 요소가
 * 손을 받게 해 누를 자리만 넓힌다. 여백으로 넓히지 않으므로 경로가 차지하는 높이는 그대로다.
 *
 * 가만히 있을 때의 모습은 원래 배치 그대로 두고, 손이 닿는 동안에만 옅어져 눌린 것을 알린다.
 */
const LINK = "relative after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] active:opacity-60";

function CategoryPath({ categories }: { readonly categories: ProductDetailResponse["categories"] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="카테고리 경로">
      {/* 경로가 여럿이면 세로로 쌓고, 한 경로 안에서는 한 줄로 이어 적는다. */}
      <ol className="flex flex-col gap-[3px]">
        {categories.map((path) => (
          <li key={path.id} className="flex items-center gap-1 text-[12px] text-[#566273]">
            <Link href={`/categories/${path.id}`} aria-label={`${path.name} 카테고리 제품`} className={LINK}>
              {path.name}
            </Link>
            <Icon name="chevron-right" size={12} scalable />
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
    // 화면 폭을 다 쓰면 용량과 가격이 양끝으로 갈라져 한 줄로 읽히지 않는다. 본문의 2/3 쯤으로 줄인다.
    <section className="w-60">
      <h3 className="sr-only">용량별 가격</h3>
      <ul className="divide-y divide-[#DEE2E9]">
        {variants.map((variant) => {
          const perUnit = unitPrice(variant.price, variant);
          return (
            <li key={variant.id} className="flex min-h-10 items-center justify-between gap-3">
              <span className="text-[13px] font-bold text-[#182132]">
                {variant.volumeValue}
                {variant.volumeUnit}
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-[12px] font-medium text-[#424E5F]">정가 {formatPrice(variant.price)}</span>
                {perUnit === undefined ? null : (
                  <span className="text-[12px] text-[#566273]">
                    {variant.volumeUnit}당 {perUnit.toLocaleString("ko-KR")}원
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

/** 고른 구성품의 성분 정보. 구성품이 여럿이면 위의 탭이 이 패널을 바꾼다. */
function SelectedPart({
  product,
  similarProducts,
  excludeCodes,
}: {
  readonly product: ProductDetailResponse;
  readonly similarProducts: readonly SimilarProductResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
}) {
  const part = product.selectedPart;
  if (!part) return null;

  const tabbed = product.productParts.length >= 2;

  return (
    <div
      role={tabbed ? "tabpanel" : undefined}
      aria-labelledby={tabbed ? partTabId(part.id) : undefined}
      className="flex flex-col gap-6"
    >
      <UsageIngredients part={part} />
      <CautionCheck
        groups={withCautionCodes(
          part.excludeGroups,
          excludeCodes,
          part.ingredients.map((ingredient) => ingredient.id),
        )}
        ingredients={part.ingredients}
      />
      <Ingredients ingredients={part.ingredients} />
      <SimilarProducts products={similarProducts} />
    </div>
  );
}

function Ingredients({ ingredients }: { readonly ingredients: ProductPartResponse["ingredients"] }) {
  return (
    <section data-no-select className="flex flex-col gap-3">
      <h3 className="text-[14px] font-bold text-[#182132]">전체 성분</h3>
      <IngredientList ingredients={ingredients} />
    </section>
  );
}

function Source({ updatedAt, productId }: { readonly updatedAt: string; readonly productId: number }) {
  const date = new Date(updatedAt)
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "")
    .replace(/\. /g, ".");

  return (
    <section className="flex flex-col gap-2 rounded-xl bg-[#EFF1F5] px-4 pt-4 pb-1">
      <div className="flex items-center gap-2">
        <span className="flex size-[max(24px,calc(24em/14))] shrink-0 items-center justify-center rounded-xl bg-[#E0F4EA] text-[14px]">
          <Icon name="badge-check" size={14} scalable className="text-[#0A6B52]" />
        </span>
        <h3 className="text-[14px] font-bold text-[#182132]">정보 출처</h3>
      </div>

      <p className="text-pretty text-[13px] leading-normal text-[#424E5F]">
        브랜드 공식 정보와 공개된 전성분표 기준이에요. {"리뉴얼로\u00a0실제\u00a0표기와"} 다를 수 있어요.
      </p>
      <p className="text-[12px] text-[#566273]">업데이트 {date}</p>

      {/* 실제 표기와 다를 수 있다고 알리는 자리에서 바로 정정을 받는다. */}
      <Link
        href={`/inquiry/products/${productId}`}
        className={`flex min-h-11 items-center justify-between gap-2 border-t border-[#DEE2E9] text-[14px] font-semibold text-[#182132] ${PRESS_TEXT}`}
      >
        정보가 다르다면 수정을 제안해 주세요
        <Icon name="chevron-right" size={16} scalable className="shrink-0 text-[#566273]" />
      </Link>
    </section>
  );
}
