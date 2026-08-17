import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrackView } from "@/components/analytics/TrackView";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientDetail } from "@/lib/api/products";
import { EXCLUDE_CODE_LABELS } from "@/lib/domain/exclude-codes";

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
  try {
    const ingredient = await fetchIngredientDetail(Number(ingredientId));
    return { title: `${ingredient.koreanName} 성분 정보`, description: ingredient.description };
  } catch {
    return {};
  }
}

export default async function IngredientDetailPage(props: PageProps<"/ingredients/[ingredientId]">) {
  const { ingredientId } = await props.params;
  const ingredient = await load(ingredientId);

  const updatedAt = new Date(ingredient.updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <>
      <TopBar title="성분 설명" variant="sub" />
      <TrackView
        event="ingredient_viewed"
        properties={{ ingredient_id: ingredient.id, entry_point: "product_detail" }}
      />

      <main className="flex-1 pb-10">
        <section className="px-4 py-5">
          <h2 className="text-[22px] font-bold text-text-primary">{ingredient.koreanName}</h2>
          <p className="mt-1 text-[13px] text-text-secondary">{ingredient.englishName}</p>

          {ingredient.skinEffects.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {ingredient.skinEffects.map((effect) => (
                <li
                  key={effect.id}
                  className="rounded-lg bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand"
                >
                  {effect.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="border-t-8 border-surface px-4 py-5">
          <h3 className="text-[16px] font-bold text-text-primary">어떤 역할을 하나요</h3>
          <p className="mt-2 text-[14px] leading-6 text-text-primary">{ingredient.description}</p>

          {ingredient.formulationRoles.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {ingredient.formulationRoles.map((role) => (
                <li key={role.id} className="rounded-lg bg-surface px-2.5 py-1 text-[12px] text-text-secondary">
                  {role.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {ingredient.groupCodes.length > 0 ? (
          <section className="border-t-8 border-surface px-4 py-5">
            <h3 className="text-[16px] font-bold text-text-primary">포함된 성분군</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {ingredient.groupCodes.map((code) => (
                <li key={code} className="text-[13px] text-text-primary">
                  {EXCLUDE_CODE_LABELS[code]}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="border-t-8 border-surface px-4 py-5">
          <h3 className="text-[14px] font-semibold text-text-primary">출처 안내</h3>
          <p className="mt-2 text-[12px] text-text-secondary">
            이 성분이 들어간 제품 {ingredient.productCount.toLocaleString("ko-KR")}개
          </p>
          {[...ingredient.infoSources, ...ingredient.effectSources].map((source) => (
            <p key={source} className="mt-1 text-[12px] text-text-secondary">
              {source}
            </p>
          ))}
          <p className="mt-2 text-[12px] text-text-secondary">정보 업데이트 · {updatedAt}</p>
        </section>
      </main>
    </>
  );
}
