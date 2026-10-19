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
import { PartTabs } from "./PartTabs";
import { PressLink } from "./PressLink";
import { ProductSaveBar, ProductSaveButtons, ProductSaveProvider } from "./ProductSaveActions";
import { PassMarker, ProductScrollState } from "./ProductScrollState";
import { ProductTopBar } from "./ProductTopBar";
import { ProductViewRecorder } from "./ProductViewRecorder";
import { SimilarProducts } from "./SimilarProducts";
import { SuggestEditLink } from "./SuggestEditLink";
import { UsageIngredients } from "./UsageIngredients";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackView } from "@/components/analytics/TrackView";
import { LevelTag } from "@/components/ui/LevelTag";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import type { UserProductState } from "@/lib/api/user-product.server";
import { withCautionIngredients } from "@/lib/domain/caution-check";
import { formatDate, formatPrice, formatUnitPrice, formatVolume } from "@/lib/domain/format";

const SIGNED_OUT: UserProductState = { status: "signedOut", wishlisted: false, shelved: false };

/** S24 제품 성분 상세. 문구와 구조는 명세(poudy-ui.pen)의 S24 프레임을 따른다. */
export function ProductDetail({
  product,
  userProduct = SIGNED_OUT,
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
      <ProductSaveProvider
        product={{ id: product.id, name: product.name }}
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
            {/* 카테고리 경로 → 제품 요약 → 저장 버튼을 16씩 띄운다. */}
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
                      <PassMarker boundary="summary" />
                    </div>
                  </div>

                  {product.moistureLevel !== null || product.oilLevel !== null ? (
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                      <LevelTag kind="moisture" level={product.moistureLevel} />
                      <LevelTag kind="oil" level={product.oilLevel} />
                    </div>
                  ) : null}

                  <Variants variants={product.variants} />
                </div>
              </section>

              {/* 이 묶음이 상단 내비 아래로 지나가면 같은 묶음을 하단에 고정해 보인다(S24-1). */}
              <div className="flex flex-col">
                <ProductSaveButtons />
                <PassMarker boundary="save" />
              </div>
            </div>

            {/* 저장 버튼 바로 아래에 두고, 내려가면 상단 내비 밑에 붙는다. 구성품이 하나면 패널만 그린다. */}
            <PartTabs
              key={product.id}
              product={product}
              entryPoint={entryPoint}
              className="flex flex-col gap-6 px-gutter pt-6 pb-10"
            >
              <SelectedPart product={product} similarProducts={similarProducts} excludeCodes={excludeCodes} />
              <Source updatedAt={product.updatedAt} productId={product.id} />
            </PartTabs>
          </main>

          <ProductSaveBar />
        </Screen>
      </ProductSaveProvider>
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
    <section className="w-60 pt-3">
      <h3 className="sr-only">용량별 가격</h3>
      <ul className="divide-y divide-border border-y border-border">
        {variants.map((variant) => {
          const perUnit = formatUnitPrice(variant.price, variant);
          return (
            <li key={variant.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
              <span className="text-13 leading-snug font-bold text-text-primary">{formatVolume(variant)}</span>
              <span className="flex flex-col items-end gap-0.5 text-caption text-text-secondary">
                <span>정가 {formatPrice(variant.price)}</span>
                {perUnit === undefined ? null : <span>{perUnit}</span>}
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
  similarProducts,
  excludeCodes,
}: {
  readonly product: ProductDetailResponse;
  readonly similarProducts: readonly SimilarProductResponse[];
  readonly excludeCodes: readonly IngredientGroupResponse[];
}) {
  const part = product.selectedPart;
  if (!part) return null;

  return (
    <div className="flex flex-col gap-6">
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
      <SimilarProducts products={similarProducts} />
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
    <section className="flex flex-col gap-2 rounded-lg bg-layer px-4 pt-4 pb-1">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-14">
          <Icon name="shield-check" size={14} scalable className="text-success-text" />
        </span>
        <h3 className="text-body leading-snug font-bold text-text-primary">정보 출처</h3>
      </div>

      <p className="text-body-sm text-pretty text-text-body">
        브랜드 공식 정보와 공개된 전성분표 기준이에요. {"리뉴얼로\u00a0실제\u00a0표기와"} 다를 수 있어요.
      </p>
      <p className="text-caption text-text-secondary">업데이트 {date}</p>

      {/* 실제 표기와 다를 수 있다고 알리는 자리에서 바로 정정을 받는다. */}
      <SuggestEditLink productId={productId} />
    </section>
  );
}
