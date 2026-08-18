import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TrackView } from "@/components/analytics/TrackView";
import { Icon } from "@/components/ui/icons/Icon";
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

  const updatedAt = new Date(ingredient.updatedAt)
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "")
    .replace(/\. /g, ".");

  return (
    <>
      <TopBar title="성분 설명" variant="sub" />
      <TrackView
        event="ingredient_viewed"
        properties={{ ingredient_id: ingredient.id, entry_point: "product_detail" }}
      />

      <main className="flex-1 pb-10">
        <section className="px-4 py-5">
          <h2 className="text-[24px] font-bold text-text-primary">{ingredient.koreanName}</h2>
          <p className="mt-1 text-[13px] text-text-secondary">{ingredient.englishName}</p>

          {ingredient.skinEffects.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {ingredient.skinEffects.map((effect) => (
                <li key={effect.id} className="rounded-lg bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                  {effect.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="border-t-8 border-surface px-4 py-5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[18px] font-bold text-text-primary">무슨 역할을 하나요?</h3>
            <span className="rounded-md bg-info-soft px-1.5 py-0.5 text-[11px] font-semibold text-info">AI 요약</span>
          </div>

          <p className="mt-2 text-[14px] leading-6 text-text-primary">{ingredient.description}</p>

          {ingredient.formulationRoles.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {ingredient.formulationRoles.map((role) => (
                <li
                  key={role.id}
                  className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                >
                  {role.name}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface p-3 text-[13px] text-text-secondary">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-text-secondary" />
            실제 사용감은 배합량과 함께 사용된 성분에 따라 달라질 수 있어요.
          </p>
        </section>

        {ingredient.groupCodes.length > 0 ? (
          <section className="border-t-8 border-surface px-4 py-5">
            <h3 className="text-[18px] font-bold text-text-primary">포함된 성분군</h3>
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
          <Link
            href={`/products?includeIngredientIds=${ingredient.id}`}
            className="flex h-13 w-full items-center justify-center rounded-button bg-action text-[14px] font-bold text-action-text"
          >
            {ingredient.koreanName} 포함 제품 {ingredient.productCount.toLocaleString("ko-KR")}개 모두 보기
          </Link>
        </section>

        <section className="border-t-8 border-surface px-4 py-5">
          <h3 className="text-[14px] font-bold text-text-primary">정보 출처 및 안내</h3>
          <p className="mt-1 text-[12px] text-text-secondary">
            성분의 일반적인 정보와 알려진 효과를 이해하기 위한 참고 자료예요. 개인의 피부 반응은 다를 수 있어요.
          </p>

          {ingredient.infoSources.length > 0 ? (
            <p className="mt-3 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-text-primary">성분 정보 출처</span>
              <span className="text-[11px] text-text-secondary">{ingredient.infoSources.join(" · ")}</span>
            </p>
          ) : null}

          {ingredient.effectSources.length > 0 ? (
            <p className="mt-2 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-text-primary">성분 효과 출처</span>
              <span className="text-[11px] text-text-secondary">{ingredient.effectSources.join(" · ")}</span>
            </p>
          ) : null}

          <p className="mt-3 text-[10px] text-text-secondary">정보 업데이트 · {updatedAt}</p>
        </section>
      </main>
    </>
  );
}
