import type {
  IngredientGroupResponse,
  ProductDetailResponse,
  ProductPartResponse,
  SimilarProductResponse,
} from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { Screen } from "@poudy/design-system/screen";
import { Fragment } from "react";

import { CautionCheck } from "./CautionCheck";
import { IngredientList } from "./IngredientList";
import { LevelInfoButton } from "./LevelInfoButton";
import { PartTabs } from "./PartTabs";
import { PressLink } from "./PressLink";
import { PassMarker, ProductScrollState } from "./ProductScrollState";
import { ProductTopBar } from "./ProductTopBar";
import { ProductViewRecorder } from "./ProductViewRecorder";
import { SimilarProducts } from "./SimilarProducts";
import { SuggestEditLink } from "./SuggestEditLink";
import { UnsuitableIngredients } from "./UnsuitableIngredients";
import { UsageIngredients } from "./UsageIngredients";
import { WishlistShelfBar, WishlistShelfProvider, WishlistShelfRow } from "./WishlistShelfActions";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackView } from "@/components/analytics/TrackView";
import { LevelTag } from "@/components/ui/LevelTag";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { withCautionIngredients } from "@/lib/domain/caution-check";
import { formatDate, formatPrice, formatUnitPrice, formatVolume } from "@/lib/domain/format";
import { SIGNED_OUT_USER_PRODUCT, skinFilterProductIdsOf, type UserProductState } from "@/lib/domain/user-product";

/** S24 제품 성분 상세. 문구와 구조는 명세(poudy-ui.pen)의 S24 프레임을 따른다. */
export function ProductDetail({
  product,
  userProduct = SIGNED_OUT_USER_PRODUCT,
  entryPoint = "direct",
  similarProducts = [],
  excludeCodes = [],
}: {
  readonly product: ProductDetailResponse;
  readonly userProduct?: UserProductState;
  readonly entryPoint?: ProductEntryPoint;
  /** 고른 구성품과 성분이 비슷한 제품. 비어 있으면 섹션을 그리지 않는다. */
  readonly similarProducts?: readonly SimilarProductResponse[];
  /** 주의 성분군에 속한 성분 목록. 고른 구성품에 든 해당 성분을 찾는 데 쓴다. */
  readonly excludeCodes?: readonly IngredientGroupResponse[];
}) {
  return (
    <ProductScrollState>
      <WishlistShelfProvider
        product={{
          id: product.id,
          name: product.name,
          brandName: product.brand.name,
          marks: product.marks,
          imageUrl: product.imageUrl,
          // 서버는 사용감을 평가하지 않는 제품(향수 · 클렌징)에 수분감을 주지 않는다. 평가 시트의 단계 수를 여기서 정한다.
          sensorySupported: product.moistureLevel !== null,
        }}
        entryPoint={entryPoint}
        initialState={userProduct}
      >
        <Screen scroll="document">
          <ProductTopBar name={product.name} imageUrl={product.imageUrl} />

          <TrackView
            event="product_viewed"
            properties={{ product_id: product.id, category: product.categories[0]?.name, entry_point: entryPoint }}
          />
          <ProductViewRecorder productId={product.id} />
          <TrackActiveTime pageType="product_detail" entityId={product.id} />

          {/*
            간격은 명세(S24)의 auto layout 을 그대로 옮긴다. 형제 사이는 부모의 gap 으로 띄우고,
            padding 은 화면 가장자리에만 둔다. 자식에 여백을 붙여 간격을 만들지 않는다.
          */}
          <main className="flex flex-1 flex-col">
            {/* 카테고리 경로 → 제품 요약 → 위시리스트 · 선반 버튼 줄을 16씩 띄운다. 버튼 줄이 지나가면 하단 고정 바가 나타난다(S24). */}
            <div className="flex flex-col gap-4 px-gutter pt-4 pb-3">
              <CategoryPath categories={product.categories} />

              <section className="flex flex-col items-center gap-4 pt-2 pb-5">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.imageUrl ? `${product.brand.name} ${product.name} 제품 이미지` : "제품 이미지"}
                  size={184}
                  loading="eager"
                />

                <div className="flex w-full flex-col items-center gap-3">
                  <div className="flex w-full flex-col items-center gap-1">
                    <PressLink
                      href={`/brands/${product.brand.id}`}
                      label={`${product.brand.name} 브랜드관`}
                      className="text-caption font-medium text-text-secondary"
                    >
                      {product.brand.name}
                    </PressLink>
                    {/* 제품명이 상단 내비 아래로 지나가면 내비 제목 자리에 제품 요약을 보인다(S24-1). */}
                    <div className="flex w-full flex-col">
                      <h1 className="text-center text-screen font-bold text-text-primary">{product.name}</h1>
                      <PassMarker />
                    </div>
                  </div>

                  {/*
                    유수분 평가 대상이 아닌 제품(클렌징 · 향수)은 값이 없어 줄째 숨긴다. 안내 버튼(ⓘ)도 함께 숨는다.
                    두 태그를 가운데에 맞추고, 버튼은 그 오른쪽 끝에 따로 붙여 가운데 계산에서 뺀다(S60 ①).
                    양쪽에 같은 폭으로 늘어나는 칸을 두고 오른쪽 칸에 버튼을 넣는다. 넉넉하면 태그가 가운데에 오고,
                    글자를 키워 태그가 줄을 채우면 왼쪽 칸이 먼저 줄어 버튼이 화면 밖으로 밀려나지 않는다.
                    안내 말풍선은 이 줄의 오른쪽 끝에 맞춰 뜬다(relative).
                  */}
                  {product.moistureLevel !== null || product.oilLevel !== null ? (
                    <div className="relative flex w-full items-center">
                      <span aria-hidden="true" className="flex-1 basis-0" />
                      <div className="flex min-w-0 flex-wrap justify-center gap-x-2 gap-y-1">
                        <LevelTag kind="moisture" level={product.moistureLevel} />
                        <LevelTag kind="oil" level={product.oilLevel} />
                      </div>
                      <span className="flex flex-1 basis-0 justify-start pl-1">
                        <LevelInfoButton />
                      </span>
                    </div>
                  ) : null}

                  <Variants variants={product.variants} />
                </div>
              </section>

              <WishlistShelfRow />
            </div>

            {/* 제품 요약 바로 아래에 두고, 내려가면 상단 내비 밑에 붙는다. 구성품이 하나면 패널만 그린다. */}
            <PartTabs
              key={product.id}
              product={product}
              entryPoint={entryPoint}
              className="flex flex-col gap-6 px-gutter pt-6 pb-10"
            >
              <SelectedPart
                product={product}
                userProduct={userProduct}
                similarProducts={similarProducts}
                excludeCodes={excludeCodes}
              />
              <Source updatedAt={product.updatedAt} productId={product.id} />
            </PartTabs>
          </main>

          <WishlistShelfBar />
        </Screen>
      </WishlistShelfProvider>
    </ProductScrollState>
  );
}

type CategoryPaths = ProductDetailResponse["categories"];

/** 같은 대분류에 걸린 소분류를 한 경로로 모은다. 명세의 `스킨케어 > 스킨/토너 · 미스트` 다. */
const byParent = (categories: CategoryPaths) => {
  const groups = new Map<
    number,
    { readonly parent: CategoryPaths[number]; readonly children: CategoryPaths[number]["child"][] }
  >();
  for (const path of categories) {
    const group = groups.get(path.id);
    if (group) group.children.push(path.child);
    else groups.set(path.id, { parent: path, children: [path.child] });
  }
  return [...groups.values()];
};

function CategoryPath({ categories }: { readonly categories: CategoryPaths }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="카테고리 경로">
      {/* 대분류가 여럿이면 세로로 쌓고, 한 경로 안에서는 한 줄로 이어 적는다. */}
      <ol className="flex flex-col gap-1">
        {byParent(categories).map(({ parent, children }) => (
          <li key={parent.id} className="flex flex-wrap items-center gap-1 text-caption text-text-secondary">
            <PressLink href={`/categories/${parent.id}`} label={`${parent.name} 카테고리 제품`}>
              {parent.name}
            </PressLink>
            <Icon name="chevron-right" size={12} scalable />
            {children.map((child, index) => (
              <Fragment key={child.id}>
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <PressLink
                  href={`/categories/${child.id}`}
                  label={`${child.name} 카테고리 제품`}
                  className="font-semibold"
                >
                  {child.name}
                </PressLink>
              </Fragment>
            ))}
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
    // 위 테두리가 없어 행(48) 안의 빈 곳이 이미 여백으로 보이므로, 위 묶음과는 묶음 간격(12)만 띄운다.
    <section className="w-60">
      <h3 className="sr-only">용량별 가격</h3>
      {/* 나눔선은 용량 사이에만 긋는다. 용량이 하나면 선이 없다(S24). */}
      <ul className="divide-y divide-border">
        {variants.map((variant) => {
          const perUnit = formatUnitPrice(variant.price, variant);
          return (
            <li key={variant.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
              <span className="text-13 leading-snug font-bold text-text-primary">{formatVolume(variant)}</span>
              <span className="flex flex-col items-end gap-0.5 text-caption leading-snug">
                <span className="font-medium text-text-body">정가 {formatPrice(variant.price)}</span>
                {perUnit === undefined ? null : <span className="text-text-secondary">{perUnit}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 고른 구성품의 성분 정보. 구성품이 여럿이면 위의 탭(PartTabs)이 이 내용을 담은 패널을 바꾼다. */
function SelectedPart({
  product,
  userProduct,
  similarProducts,
  excludeCodes,
}: {
  readonly product: ProductDetailResponse;
  readonly userProduct: UserProductState;
  readonly similarProducts: readonly SimilarProductResponse[];
  readonly excludeCodes: readonly IngredientGroupResponse[];
}) {
  const part = product.selectedPart;
  if (!part) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* 나만의 필터에 걸린 성분은 구성품마다 다르다. 회원 정보도 이 구성품(partId)으로 받는다. */}
      <UnsuitableIngredients productId={product.id} userProduct={userProduct} ingredients={part.ingredients} />
      <CautionCheck
        productId={product.id}
        groups={withCautionIngredients(
          part.excludeGroups,
          excludeCodes,
          part.ingredients.map((ingredient) => ingredient.id),
        )}
        ingredients={part.ingredients}
      />
      <UsageIngredients productId={product.id} part={part} />
      <Ingredients ingredients={part.ingredients} />
      <SimilarProducts products={similarProducts} skinFilterProductIds={skinFilterProductIdsOf(userProduct)} />
    </div>
  );
}

function Ingredients({ ingredients }: { readonly ingredients: ProductPartResponse["ingredients"] }) {
  return (
    <>
      <section data-no-select className="flex flex-col gap-3">
        <h3 className="text-section font-bold text-text-primary">전체 성분</h3>
        <IngredientList ingredients={ingredients} />
      </section>
      <p className="flex gap-2 text-caption text-text-body">
        {/* 첫 줄 가운데에 맞춘다. 글자 줄 높이(12 × 1.4)와 아이콘(12)의 차이만큼 위를 띄운다. */}
        <span className="flex shrink-0 pt-0.5">
          <Icon name="info-circle" size={12} scalable />
        </span>
        공개된 전성분표의 성분명을 기준으로 분류했어요.
      </p>
    </>
  );
}

function Source({ updatedAt, productId }: { readonly updatedAt: string; readonly productId: number }) {
  const date = formatDate(updatedAt);

  return (
    <section className="flex flex-col rounded-lg bg-layer">
      <div className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-14">
            <Icon name="shield-check" size={14} scalable className="text-success-text" />
          </span>
          <h3 className="text-body leading-snug font-bold text-text-primary">정보 출처</h3>
        </div>

        {/* 명세처럼 두 문장을 줄을 바꿔 쓴다. 넓은 화면에서도 둘째 문장이 첫 줄 끝에 붙어 갈라지지 않는다. */}
        <p className="text-body-sm text-pretty text-text-body">
          브랜드 공식 정보와 공개된 전성분표 기준이에요.
          <br />
          리뉴얼로 실제 표기와 다를 수 있어요.
        </p>
        <p className="text-caption text-text-secondary">업데이트 {date}</p>
        {/* 출처 설명과 보조 동작을 나누는 선. 카드 안쪽 여백 안에만 긋는다. */}
        <div aria-hidden="true" className="h-px bg-border" />
      </div>

      {/* 실제 표기와 다를 수 있다고 알리는 자리에서 바로 정정을 받는다. */}
      <SuggestEditLink productId={productId} />
    </section>
  );
}
