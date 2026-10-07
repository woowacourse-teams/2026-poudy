import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackIngredientView } from "@/components/analytics/TrackIngredientView";
import { AiSummaryBadge } from "@/components/ingredient/AiSummaryBadge";
import { EffectTag } from "@/components/ingredient/EffectTag";
import { IngredientReferences } from "@/components/ingredient/IngredientReferences";
import { IngredientTitle } from "@/components/ingredient/IngredientTitle";
import { JsonLd } from "@/components/seo/JsonLd";
import { Icon } from "@/components/ui/icons/Icon";
import { ShareButton } from "@/components/ui/ShareButton";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientDetail } from "@/lib/api/products";
import { markdownAlternates } from "@/lib/seo/markdown";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";
import { ingredientStructuredData } from "@/lib/seo/structured-data";

// 성분 설명은 거의 바뀌지 않고 검색 노출 대상이다.
export const revalidate = 86400;

const load = async (raw: string) => {
  const ingredientId = Number(raw);
  if (!Number.isInteger(ingredientId)) notFound();

  try {
    return await fetchIngredientDetail(ingredientId);
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
    const ingredient = await fetchIngredientDetail(Number(ingredientId));
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
      <TopBar title="성분 설명" variant="sub" right={<ShareButton />} />
      {/* 유입 경로를 브라우저에서 읽으므로 경계를 둔다. 본문은 그대로 미리 만들어진다. */}
      <Suspense fallback={null}>
        <TrackIngredientView ingredientId={ingredient.id} />
      </Suspense>
      <TrackActiveTime pageType="ingredient_detail" entityId={ingredient.id} />

      {/* 화면 전체가 성분 정보라 본문째 선택을 막는다. 규칙은 globals.css 에 있다. */}
      <main data-no-select className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-6">
        <section className="flex flex-col gap-2">
          <IngredientTitle koreanName={ingredient.koreanName} englishName={ingredient.englishName} />

          {ingredient.skinEffects.length > 0 ? (
            <ul aria-label="피부 작용" className="flex flex-wrap items-center gap-2">
              {ingredient.skinEffects.map((effect) => (
                <li key={effect.id}>
                  <EffectTag effect={effect} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex h-7 items-center justify-between">
            <h3 className="text-[18px] font-bold text-[#182132]">무슨 역할을 하나요?</h3>
            <AiSummaryBadge />
          </div>

          <p className="text-pretty text-[15px] leading-[1.6] text-[#424E5F]">{ingredient.description}</p>

          {/*
            제형에서 맡는 배합 목적이다. 피부에 주는 효과(skinEffects)와 다른 축이라
            머리말 옆 태그와 섞지 않고 설명 아래에 따로 둔다.
          */}
          {ingredient.formulationRoles.length > 0 ? (
            <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-2">
              {ingredient.formulationRoles.map((role) => (
                <li
                  key={role.id}
                  className="flex h-7 items-center rounded-[14px] bg-[#EFF1F5] px-3 text-[12px] font-medium text-[#424E5F]"
                >
                  {role.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <Link
          href={`/products?includeIngredientIds=${ingredient.id}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#182132] px-4 text-[14px] leading-[1.3] font-bold text-white"
        >
          {/*
            이름이 길어도 단추가 한 줄을 넘지 않게 이름만 줄인다.
            뒤따르는 개수와 화살표는 끝까지 보여야 눌러서 무엇을 볼지 알 수 있다.
          */}
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{ingredient.koreanName}</span>
            <span className="shrink-0">포함 제품 {ingredient.productCount.toLocaleString("ko-KR")}개 모두 보기</span>
          </span>
          <Icon name="chevron-right" size={16} className="shrink-0" />
        </Link>

        <IngredientReferences
          infoSources={ingredient.infoSources}
          effectSources={ingredient.effectSources}
          updatedAt={ingredient.updatedAt}
        />
      </main>
    </>
  );
}
