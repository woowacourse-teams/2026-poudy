import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrackActiveTime } from "@/components/analytics/TrackActiveTime";
import { TrackIngredientGroupView } from "@/components/analytics/TrackIngredientGroupView";
import { IngredientTileLink, ProductsLink } from "@/components/ingredient/IngredientLinks";
import { IngredientRole, RoleDescriptionText } from "@/components/ingredient/IngredientRole";
import { IngredientTopBar } from "@/components/ingredient/IngredientTopBar";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientGroup } from "@/lib/api/products";
import { formatEnglishName } from "@/lib/domain/format";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";

// 성분군 설명은 성분 설명처럼 거의 바뀌지 않는다.
export const revalidate = 86400;

const load = async (code: string) => {
  try {
    return await fetchIngredientGroup(code);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

export async function generateMetadata(props: PageProps<"/ingredient-groups/[groupCode]">): Promise<Metadata> {
  const { groupCode } = await props.params;

  // 여기서 notFound() 를 부르면 렌더링 경로 밖이라 404 상태가 전해지지 않는다.
  // 조회에 실패해도 canonical 은 남긴다.
  const canonical = `/ingredient-groups/${groupCode}`;

  try {
    const group = await fetchIngredientGroup(decodeURIComponent(groupCode));
    const title = `${groupDisplayName(group.name)} 성분군 정보`;
    const description = group.description;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { ...OPEN_GRAPH_BASE, title, description, url: canonical },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

/** S25a 성분군 설명. 문구와 구조는 design/poudy-ui.pen 을 따른다. */
export default async function IngredientGroupPage(props: PageProps<"/ingredient-groups/[groupCode]">) {
  const { groupCode } = await props.params;
  const group = await load(decodeURIComponent(groupCode));
  const name = groupDisplayName(group.name);

  return (
    <>
      <IngredientTopBar title="성분군 설명" shareName={name} />
      {/* 성분 설명과 같이 조회·체류시간을 남긴다. 유입 경로를 브라우저에서 읽으므로 경계를 둔다. */}
      <Suspense fallback={null}>
        <TrackIngredientGroupView groupCode={group.code} />
      </Suspense>
      <TrackActiveTime pageType="ingredient_group_detail" entityCode={group.code} />

      {/* 성분 설명과 같이 화면 전체가 성분 정보라 본문째 선택을 막는다. */}
      <main data-no-select className="flex flex-1 flex-col gap-6 px-gutter pt-4 pb-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-screen font-bold break-keep text-text-primary">{name}</h1>
          {group.englishName ? (
            <p className="text-body-sm leading-snug text-text-muted">{formatEnglishName(group.englishName)}</p>
          ) : null}
        </section>

        <IngredientRole description={<RoleDescriptionText>{group.description}</RoleDescriptionText>} />

        <ProductsLink href={`/products?includeGroupCodes=${encodeURIComponent(group.code)}`}>
          {/* 성분 설명과 같이 이름만 줄인다. 글자를 키우면 뒤 문구가 다음 줄로 넘어가 끝까지 보인다. */}
          <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 text-center">
            <span className="max-w-full truncate">{name}</span>
            <span>성분군 포함 제품 보기</span>
          </span>
        </ProductsLink>

        {group.ingredients.length > 0 ? (
          <section aria-labelledby="group-ingredients-title" className="flex flex-col gap-3">
            <h2 id="group-ingredients-title" className="flex flex-wrap gap-x-1 text-section">
              <span className="font-bold text-text-primary">이 성분군에 포함된 성분</span>
              <span className="font-semibold text-text-secondary">{group.ingredients.length}종</span>
            </h2>
            {/* 2열 타일. 글자를 키워 두 칸에 이름이 들지 않으면 한 줄에 하나씩 놓는다. 폭을 재는 칸 안에 격자를 둔다. */}
            <div className="@container">
              <ul className="grid grid-cols-1 gap-2 @min-[18em]:grid-cols-2">
                {group.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <IngredientTileLink
                      href={`/ingredients/${ingredient.id}?from=ingredient_group_detail`}
                      koreanName={ingredient.koreanName}
                      englishName={ingredient.englishName}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
