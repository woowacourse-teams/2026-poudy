import type { CurationDetailResponse, IngredientDetailResponse, ProductDetailResponse } from "@poudy/api/api.zod";

import { absoluteUrl } from "./site";

import { curationOneLine } from "@/lib/domain/curation-text";
import { productIngredientDescription } from "@/lib/domain/product-display";

/** 성분 화면에 표시하는 설명·출처·갱신일을 그대로 전달한다. */
export const ingredientStructuredData = (ingredient: IngredientDetailResponse) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": absoluteUrl(`/ingredients/${ingredient.id}#webpage`),
  url: absoluteUrl(`/ingredients/${ingredient.id}`),
  name: `${ingredient.koreanName} 성분 정보`,
  description: ingredient.description,
  inLanguage: "ko-KR",
  dateModified: ingredient.updatedAt,
  isPartOf: { "@id": absoluteUrl("/#website") },
  mainEntity: {
    "@type": "DefinedTerm",
    "@id": absoluteUrl(`/ingredients/${ingredient.id}#ingredient`),
    name: ingredient.koreanName,
    alternateName: ingredient.englishName,
    description: ingredient.description,
  },
  citation: [...new Set([...ingredient.infoSources, ...ingredient.effectSources])],
});

/** 이동 경로의 한 칸. 주소는 사이트 안의 경로로 받고 절대 주소로 바꿔 싣는다. */
export type Crumb = {
  readonly name: string;
  readonly path: string;
};

const HOME: Crumb = { name: "홈", path: "/" };

/** 홈에서 이 화면까지의 경로. 검색 결과에 주소 대신 이 경로가 보일 수 있다. */
export const breadcrumbList = (crumbs: readonly Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [HOME, ...crumbs].map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(crumb.path),
  })),
});

/**
 * 목록 화면이 이 장에 담은 제품. 순서는 목록 전체에서의 자리로 센다.
 * 2 페이지의 첫 제품은 1 번이 아니라 앞 장 크기 다음 번호다.
 */
export const itemList = (
  products: readonly { readonly id: number; readonly name: string }[],
  firstPosition: number,
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: products.map((product, index) => ({
    "@type": "ListItem",
    position: firstPosition + index,
    url: absoluteUrl(`/products/${product.id}`),
    name: product.name,
  })),
});

export const curationStructuredData = (curation: CurationDetailResponse) => {
  const products = curation.blocks.flatMap((block) => {
    if (block.type === "IMAGE") return [];
    if (block.type === "PRODUCTS_BY_FILTER") return block.products.map(({ product }) => product);
    return block.products;
  });
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`/curations/${curation.id}#webpage`),
    url: absoluteUrl(`/curations/${curation.id}`),
    name: curationOneLine(curation.title),
    description: curation.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": absoluteUrl("/#website") },
    publisher: { "@id": absoluteUrl("/#organization") },
    mainEntity: itemList(products, 1),
  };
};

export const collectionPageStructuredData = ({
  path,
  title,
  description,
  products,
  firstPosition,
}: {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly products: readonly { readonly id: number; readonly name: string }[];
  readonly firstPosition: number;
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${absoluteUrl(path)}#webpage`,
  url: absoluteUrl(path),
  name: title,
  description,
  inLanguage: "ko-KR",
  isPartOf: { "@id": absoluteUrl("/#website") },
  publisher: { "@id": absoluteUrl("/#organization") },
  mainEntity: itemList(products, firstPosition),
});

const DISCONTINUED = "discontinued";

/**
 * 가격이 있는 제품에만 Product 를 싣는다.
 *
 * 판매 정보 없이 Product 만 두면 제품 스니펫 자격을 갖추지 못해 서치 콘솔이 오류로 센다
 * (9/7 에 그래서 뺐다). 값을 지어내지 않고, 가격을 아는 옵션이 없으면 싣지 않는다.
 * 옵션마다 가격이 다르면 최저·최고가로 묶는다.
 */
export const productStructuredData = (product: ProductDetailResponse) => {
  const prices = product.variants
    .filter((variant) => variant.price > 0 && variant.status !== DISCONTINUED)
    .map((variant) => variant.price);
  if (prices.length === 0) return undefined;

  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": absoluteUrl(`/products/${product.id}#product`),
    name: product.name,
    description: productIngredientDescription({
      brandName: product.brand.name,
      productName: product.name,
      ingredientCount: product.ingredients.length,
      effectNames: product.skinEffectGroups.map((group) => group.name),
    }),
    brand: { "@type": "Brand", name: product.brand.name },
    url: absoluteUrl(`/products/${product.id}`),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    offers: offersOf(lowPrice, highPrice, prices.length),
  };
};

const offersOf = (lowPrice: number, highPrice: number, offerCount: number) => {
  if (lowPrice === highPrice) return { "@type": "Offer", price: lowPrice, priceCurrency: "KRW" };
  return { "@type": "AggregateOffer", lowPrice, highPrice, offerCount, priceCurrency: "KRW" };
};

/** 제품 상세의 이동 경로. 카테고리가 있으면 대분류·소분류를, 없으면 브랜드를 거친다. */
export const productCrumbs = (product: ProductDetailResponse): readonly Crumb[] => {
  const self = { name: product.name, path: `/products/${product.id}` };
  const category = product.categories[0];
  if (!category) return [{ name: product.brand.name, path: `/brands/${product.brand.id}` }, self];

  return [
    { name: category.name, path: `/categories/${category.id}` },
    { name: category.child.name, path: `/categories/${category.child.id}` },
    self,
  ];
};
