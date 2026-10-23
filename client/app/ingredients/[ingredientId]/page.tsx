import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackIngredientView } from "@/components/analytics/TrackIngredientView";
import { EffectTag } from "@/components/ingredient/EffectTag";
import { ProductsLink } from "@/components/ingredient/IngredientLinks";
import { IngredientReferences } from "@/components/ingredient/IngredientReferences";
import { IngredientRole, RoleDescriptionText } from "@/components/ingredient/IngredientRole";
import { IngredientTitle } from "@/components/ingredient/IngredientTitle";
import { IngredientTopBar } from "@/components/ingredient/IngredientTopBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductCard } from "@/components/ui/ProductCard";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientDetail } from "@/lib/api/products";
import { formatCount } from "@/lib/domain/format";
import { markdownAlternates } from "@/lib/seo/markdown";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";
import { ingredientStructuredData } from "@/lib/seo/structured-data";

// 성분 설명은 거의 바뀌지 않고 검색 노출 대상이다.
export const revalidate = 86400;

const load = async (raw: string) => {
  const ingredientId = Number(raw);
  if (!Number.isInteger(ingredientId)) notFound();

  try {
    return await fetchIngredientDetail(ingredientId, 3);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

export async function generateMetadata(props: PageProps<"/ingredients/[ingredientId]">): Promise<Metadata> {
  const { ingredientId } = await props.params;

  // 여기서 notFound() 를 부르면 렌더링 경로 밖이라 404 상태가 전해지지 않는다.
  // 조회에 실패해도 canonical 은 남긴다.
  const canonical = `/ingredients/${ingredientId}`;

  try {
    const ingredient = await fetchIngredientDetail(Number(ingredientId), 3);
    const title = `${ingredient.koreanName} 성분 정보`;
    const description = ingredient.description;
    const image = `/ingredients/${ingredientId}/opengraph-image`;
    return {
      title,
      description,
      alternates: markdownAlternates(canonical),
      openGraph: { ...OPEN_GRAPH_BASE, title, description, url: canonical, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

export default async function IngredientDetailPage(props: PageProps<"/ingredients/[ingredientId]">) {
  const { ingredientId } = await props.params;
  const ingredient = await load(ingredientId);

  return (
    <>
      <JsonLd data={ingredientStructuredData(ingredient)} />
      <IngredientTopBar title="성분 설명" shareName={ingredient.koreanName} />
      {/* 유입 경로를 브라우저에서 읽으므로 경계를 둔다. 본문은 그대로 미리 만들어진다. */}
      <Suspense fallback={null}>
        <TrackIngredientView ingredientId={ingredient.id} />
      </Suspense>
      <TrackActiveTime pageType="ingredient_detail" entityId={ingredient.id} />

      {/* 화면 전체가 성분 정보라 본문째 선택을 막는다. 규칙은 globals.css 에 있다. */}
      <main data-no-select className="flex flex-1 flex-col gap-6 px-gutter pt-4 pb-6">
        <section className="flex flex-col gap-2">
          <IngredientTitle koreanName={ingredient.koreanName} englishName={ingredient.englishName} />

          {ingredient.skinEffects.length > 0 ? (
            <ul aria-label="피부 작용" className="flex flex-wrap items-center gap-2">
              {ingredient.skinEffects.map((effect) => (
                <li key={effect.id} className="flex">
                  <EffectTag effect={effect} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <IngredientRole
          description={<RoleDescriptionText>{ingredient.description}</RoleDescriptionText>}
          roles={ingredient.formulationRoles}
        />

        <ProductsLink href={`/products?includeIngredientIds=${ingredient.id}`}>
          {/*
            이름이 길면 이름만 줄인다. 뒤따르는 개수는 끝까지 보여야 눌러서 무엇을 볼지 알 수 있다.
            기기에서 글자를 키워 한 줄에 다 들어가지 않으면, 개수 쪽이 다음 줄로 넘어가 링크가 높아진다.
          */}
          <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 text-center">
            <span className="max-w-full truncate">{ingredient.koreanName}</span>
            <span>포함 제품 {formatCount(ingredient.productCount)} 모두 보기</span>
          </span>
        </ProductsLink>

        {ingredient.products.length > 0 ? (
          <section aria-label={`${ingredient.koreanName} 포함 제품`}>
            <h2 className="text-body font-bold text-text-primary">이 성분이 포함된 제품</h2>
            <ul>
              {ingredient.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} entryPoint="product_list" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <IngredientReferences
          infoSources={ingredient.infoSources}
          effectSources={ingredient.effectSources}
          updatedAt={ingredient.updatedAt}
        />
      </main>
    </>
  );
}
