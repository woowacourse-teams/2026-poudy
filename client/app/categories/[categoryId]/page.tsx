import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { RevealingCategoryTrack } from "@/components/directory/CategoryTrack";
import { CategoryTrackSkeleton } from "@/components/directory/DetailHeadingSkeleton";
import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { JsonLd } from "@/components/seo/JsonLd";
import { StreamBoundary } from "@/components/ui/StreamBoundary";
import { TopBar } from "@/components/ui/TopBar";
import { fetchCategories, fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { FIRST_PAGE, type Filter, parseFilter } from "@/lib/domain/filter";
import type { InitialPage } from "@/lib/hooks/useProductPages";
import { requireProductPage } from "@/lib/navigation/product-page-range";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";
import { OPEN_GRAPH_BASE, pagedCanonical } from "@/lib/seo/metadata";
import { breadcrumbList, itemList, type Crumb } from "@/lib/seo/structured-data";
import { productPagesKey } from "@/lib/storage/product-pages-cache";

/*
 * 조건이 주소에 붙어 어차피 요청마다 그려지지만, 그 사실을 코드로 남긴다.
 * 카탈로그 조회의 fetch 캐시는 이 설정과 무관하게 그대로 동작한다.
 */
export const dynamic = "force-dynamic";

/** 이 장에 담긴 제품을 구조화 데이터로 싣는다. 번호는 목록 전체에서의 자리로 센다. */
const pageItemList = (filter: Filter, initialPage: InitialPage | undefined) => {
  if (!initialPage) return undefined;
  return itemList(initialPage.response.items, (filter.page - 1) * filter.size + 1);
};

/** 두 조각이 같은 목록을 본다. 한 요청 안에서는 한 번만 받는다. */
const categoriesOnce = cache(fetchCategories);

/**
 * 대분류를 고르면 그 아래 소분류를 모두 담고, 소분류를 고르면 형제들을 가로로 보여 준다.
 * 두 조각이 같은 계산을 하므로 한 자리에 둔다.
 */
const resolveCategory = async (id: number) => {
  const categories = await categoriesOnce();

  const parent = categories.items.find((category) => category.id === id);
  const owner = categories.items.find((category) => category.children.some((child) => child.id === id));
  const child = owner?.children.find((candidate) => candidate.id === id);

  const name = child?.name ?? parent?.name;
  if (!name) notFound();

  const top = owner ?? parent;

  return {
    categories,
    name,
    top,
    // 소분류를 보는 중에도 대분류 전체로 돌아올 수 있도록 맨 앞에 `전체` 를 둔다.
    trackItems: top ? [{ id: top.id, name: "전체" }, ...top.children] : [],
    categoryIds: child ? [child.id] : (parent?.children ?? []).map((item) => item.id),
  };
};

export async function generateMetadata(props: PageProps<"/categories/[categoryId]">): Promise<Metadata> {
  const { categoryId } = await props.params;
  const { page } = parseFilter(toSearchParams(await props.searchParams));
  const canonical = pagedCanonical(`/categories/${categoryId}`, page);
  const id = Number(categoryId);

  if (!Number.isInteger(id)) return { alternates: { canonical } };

  try {
    const categories = await categoriesOnce();
    const parent = categories.items.find((category) => category.id === id);
    const child = categories.items.flatMap((category) => category.children).find((category) => category.id === id);
    const name = child?.name ?? parent?.name;

    if (!name) return { alternates: { canonical } };

    const title = `${name} 화장품`;
    const description = `${name} 카테고리의 화장품과 전성분 정보를 확인해 보세요.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { ...OPEN_GRAPH_BASE, title, description, url: canonical, images: ["/opengraph-image"] },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

/** 카테고리 목록 아래 대분류, 소분류를 보고 있으면 그 아래 소분류까지 거친다. */
const categoryCrumbs = (id: number, name: string, top: { readonly id: number; readonly name: string } | undefined) => {
  const crumbs: Crumb[] = [{ name: "카테고리", path: "/categories" }];
  if (top) crumbs.push({ name: top.name, path: `/categories/${top.id}` });
  if (top?.id !== id) crumbs.push({ name, path: `/categories/${id}` });
  return crumbs;
};

/** 형제 카테고리 줄은 제품 목록과 별개로 스트리밍한다. */
async function CategoryTrackContent({ params }: { readonly params: PageProps<"/categories/[categoryId]">["params"] }) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  const { trackItems } = await resolveCategory(id);

  return <RevealingCategoryTrack items={trackItems} selectedId={id} />;
}

/** 필터 재료와 첫 장. 제목을 막지 않고 별도 경계에서 스트리밍한다. */
async function CategoryProducts({
  params,
  searchParams,
}: {
  readonly params: PageProps<"/categories/[categoryId]">["params"];
  readonly searchParams: SearchParams;
}) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  const { categoryIds } = await resolveCategory(id);
  const urlFilter = parseFilter(toSearchParams(await searchParams));
  const filter = { ...urlFilter, categoryIds };
  const key = productPagesKey(filter);

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄이 제품 조회보다 먼저 나가고,
   * 목록 자리만 도착을 기다린다. 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts(filter)
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return (
    <>
      <JsonLd data={pageItemList(filter, initialPage)} />
      <ProductList
        basePath={`/categories/${id}`}
        surface="category"
        fixedFilter={{ categoryIds }}
        hiddenChips={["category"]}
        stickyChips="category"
        excludeCodes={excludeCodes.items}
        initialPage={initialPage}
      />
    </>
  );
}

export default async function CategoryProductsPage(props: PageProps<"/categories/[categoryId]">) {
  const [{ categoryId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  /*
   * 카테고리 이름이 이 화면의 대표 제목이라 바에 먼저 그린다. 카테고리 목록은 오래 캐시되어
   * 셸을 거의 늦추지 않고, 없는 카테고리면 스트리밍 전이라 404 를 낼 수 있다.
   */
  const { name, top, categoryIds } = await resolveCategory(id);
  const filter = parseFilter(toSearchParams(searchParams));

  // 첫 장만 스트리밍한다. 뒤쪽 장은 목록까지 다 그린 뒤 보내므로 없는 장이면 404 를 낼 수 있다.
  const stream = filter.page === FIRST_PAGE;
  if (!stream) await requireProductPage({ ...filter, categoryIds });

  return (
    <>
      <TopBar title={name} variant="root" showBack edge={false} />
      <JsonLd data={breadcrumbList(categoryCrumbs(id, name, top))} />

      <StreamBoundary stream={stream} fallback={<CategoryTrackSkeleton />}>
        <CategoryTrackContent params={props.params} />
      </StreamBoundary>

      {/* 데이터 대기 중에는 목록 자리를 확보하고, 도착 후에는 카드별 스켈레톤으로 이어진다. */}
      <StreamBoundary
        stream={stream}
        fallback={<ProductListSkeleton hiddenChips={["category"]} stickyChips="category" />}
      >
        <CategoryProducts params={props.params} searchParams={props.searchParams} />
      </StreamBoundary>
    </>
  );
}
