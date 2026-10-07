import type { ProductDetailResponse, ProductPartResponse } from "@poudy/api/api.zod";
import Link from "next/link";

import { IngredientList } from "./IngredientList";
import { PartTabs } from "./PartTabs";
import { ProductViewRecorder } from "./ProductViewRecorder";
import { SaveProductButton } from "./SaveProductButton";
import { UsageIngredients } from "./UsageIngredients";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
import { LevelTag } from "@/components/ui/LevelTag";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { ShareButton } from "@/components/ui/ShareButton";
import { SummaryEnd, SummaryHeader } from "@/components/ui/SummaryHeader";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { cautionSummary, sortedCautions } from "@/lib/domain/caution-check";
import { formatPrice, unitPrice } from "@/lib/domain/product-display";
import { partTabId } from "@/lib/domain/product-parts";

/** S24 제품 성분 상세. 문구와 구조는 design/v2.pen 을 따른다. */
export function ProductDetail({
  product,
  entryPoint = "direct",
}: {
  readonly product: ProductDetailResponse;
  readonly entryPoint?: ProductEntryPoint;
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

            {/* 축약형이 나타나는 자리는 저장 버튼 바로 아래다. 둘 사이에 gap 이 끼지 않게 한 묶음에 둔다. */}
            <div className="flex flex-col">
              <SaveProductButton productId={product.id} productName={product.name} entryPoint={entryPoint} />
              <SummaryEnd />
            </div>
          </div>
        </div>

        {/* 저장 버튼 바로 아래에 두고, 내려가면 머리에 붙는다. */}
        <PartTabs product={product} entryPoint={entryPoint} />

        <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
          <SelectedPart product={product} />
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
function SelectedPart({ product }: { readonly product: ProductDetailResponse }) {
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
      <CautionCheck groups={part.excludeGroups} />
      <Ingredients ingredients={part.ingredients} />
    </div>
  );
}

/**
 * 주의 성분 확인 원 안의 표시. 경로는 Tabler 의 x · check 다.
 *
 * 24 단위 viewBox 그대로 두면 check 는 그림이 오른쪽 위로 치우쳐 있어 원 안에서 가운데로 보이지 않는다.
 * viewBox 를 그림(선 굵기의 절반까지)에 딱 맞게 잘라 그림의 가운데가 상자의 가운데에 오게 한다.
 *
 * 크기는 디자인(24 단위를 13px)에 가까운 정수 px 로 둔다. 8.1px 처럼 소수로 두면 20px 원 안에서
 * 놓이는 자리가 픽셀 격자에 맞춰지며 반 픽셀쯤 밀린다. 비율이 다른 칸은 viewBox 가 가운데로 맞춰 넣는다.
 */
const MARKS = {
  x: { viewBox: "4.5 4.5 15 15", width: 8, height: 8, paths: ["M18 6l-12 12", "M6 6l12 12"] },
  check: { viewBox: "3.5 5.5 18 13", width: 10, height: 8, paths: ["M5 12l5 5l10 -10"] },
} as const;

function CautionMark({ kind }: { readonly kind: keyof typeof MARKS }) {
  const { viewBox, width, height, paths } = MARKS[kind];

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * 주의 성분 확인. 기준마다 공개 전성분에 들었는지를 두 칸 격자로 보여 준다.
 * 들어 있는 기준을 앞에 두어 눈이 먼저 닿게 한다.
 */
function CautionCheck({ groups }: { readonly groups: ProductPartResponse["excludeGroups"] }) {
  if (groups.length === 0) return null;

  const summary = cautionSummary(groups);

  return (
    <section data-no-select className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-[#182132]">주의 성분 확인</h3>
        <p className={`text-[12px] font-bold ${summary.contains ? "text-[#C53030]" : "text-[#0A6B52]"}`}>
          {summary.label}
        </p>
      </div>

      {/*
        이름 길이가 제각각이라 흘려 놓으면 줄마다 끝이 들쭉날쭉하다. 두 칸 격자로 줄을 맞춘다.
        서버는 기준 이름만 주므로 "있음"·"없음" 은 화면에서 붙인다.
      */}
      <ul className="grid grid-cols-2 gap-3">
        {sortedCautions(groups).map((group) => (
          <li key={group.name} className="flex items-center gap-2">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-white ${group.contains ? "bg-[#C53030]" : "bg-[#17A47A]"}`}
            >
              <CautionMark kind={group.contains ? "x" : "check"} />
            </span>
            <span
              className={`text-[14px] leading-[1.4] ${group.contains ? "font-semibold text-[#182132]" : "font-medium text-[#424E5F]"}`}
            >
              {group.name} {group.contains ? "있음" : "없음"}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
        <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-[#E0F4EA]">
          <Icon name="badge-check" size={14} className="text-[#0A6B52]" />
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
        className="flex min-h-11 items-center justify-between gap-2 border-t border-[#DEE2E9] text-[14px] font-semibold text-[#182132]"
      >
        정보가 다르다면 수정을 제안해 주세요
        <Icon name="chevron-right" size={16} className="shrink-0 text-[#566273]" />
      </Link>
    </section>
  );
}
