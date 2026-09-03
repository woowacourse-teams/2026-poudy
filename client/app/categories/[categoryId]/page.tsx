import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";

import { CategoryTrack } from "@/components/directory/CategoryTrack";
import { CategoryTrackSkeleton } from "@/components/directory/DetailHeadingSkeleton";
import { ProductList } from "@/components/product/ProductList";
import { TopBar } from "@/components/ui/TopBar";
import { fetchCategories, fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { parseFilter } from "@/lib/domain/filter";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";

/*
 * 조건이 주소에 붙어 어차피 요청마다 그려지지만, 그 사실을 코드로 남긴다.
 * 카탈로그 조회의 fetch 캐시는 이 설정과 무관하게 그대로 동작한다.
 */
export const dynamic = "force-dynamic";

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
  const canonical = `/categories/${categoryId}`;
  const id = Number(categoryId);

  if (!Number.isInteger(id)) return { alternates: { canonical } };

  try {
    const categories = await categoriesOnce();
    const parent = categories.items.find((category) => category.id === id);
    const child = categories.items.flatMap((category) => category.children).find((category) => category.id === id);
    const name = child?.name ?? parent?.name;

    if (!name) return { alternates: { canonical } };

    return {
      title: `${name} 화장품`,
      description: `${name} 카테고리의 화장품과 전성분 정보를 확인해 보세요.`,
      alternates: { canonical },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

/** 형제 카테고리 줄은 제품 목록과 별개로 스트리밍한다. */
async function CategoryTrackContent({ params }: { readonly params: PageProps<"/categories/[categoryId]">["params"] }) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  const { trackItems } = await resolveCategory(id);

  return (
    <div className="px-4">
      <CategoryTrack items={trackItems} selectedId={id} />
    </div>
  );
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
  const key = JSON.stringify({ ...filter, page: 0 });

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄이 제품 조회보다 먼저 나가고,
   * 목록 자리만 도착을 기다린다. 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts({ ...filter, page: 0 })
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return (
    <ProductList
      basePath={`/categories/${id}`}
      surface="category"
      fixedFilter={{ categoryIds }}
      hiddenChips={["category"]}
      excludeCodes={excludeCodes.items}
      initialPage={initialPage}
    />
  );
}

export default function CategoryProductsPage(props: PageProps<"/categories/[categoryId]">) {
  return (
    <>
      <TopBar title="카테고리" variant="root" showBack />

      <Suspense fallback={<CategoryTrackSkeleton />}>
        <CategoryTrackContent params={props.params} />
      </Suspense>

      {/* 제품군 전체를 가리지 않는다. 행이 도착한 뒤 각 이미지만 자기 스켈레톤을 쓴다. */}
      <Suspense fallback={null}>
        <CategoryProducts params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
