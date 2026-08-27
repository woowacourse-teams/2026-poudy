import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrackIngredientView } from "@/components/analytics/TrackIngredientView";
import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientDetail } from "@/lib/api/products";
import { EXCLUDE_CODE_LABELS } from "@/lib/domain/exclude-codes";
import { effectColor } from "@/lib/domain/skin-effect-colors";

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
    const title = `${ingredient.koreanName} 성분 정보`;
    const description = ingredient.description;
    const image = `/ingredients/${ingredientId}/opengraph-image`;
    return {
      title,
      description,
      alternates: { canonical: `/ingredients/${ingredientId}` },
      openGraph: { title, description, type: "website", images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
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
      {/* 아래로 내리면 큰 제목이 사라지므로 상단에 성분 이름을 남긴다. */}
      <TopBar title={ingredient.koreanName} variant="sub" />
      {/* 유입 경로를 브라우저에서 읽으므로 경계를 둔다. 본문은 그대로 미리 만들어진다. */}
      <Suspense fallback={null}>
        <TrackIngredientView ingredientId={ingredient.id} />
      </Suspense>

      {/* 디자인 S06 은 본문을 좌우 32px 안쪽으로 넣는다. */}
      <main className="flex-1 px-8">
        <section className="flex flex-col gap-2 pt-5 pb-[18px]">
          <h2 className="text-[24px] font-bold text-[#202124]">{ingredient.koreanName}</h2>
          <p className="text-[13px] text-[#72747A]">{ingredient.englishName}</p>

          {ingredient.skinEffects.length > 0 ? (
            <ul className="flex h-[26px] items-center gap-1.5">
              {ingredient.skinEffects.map((effect) => {
                const color = effectColor(effect.code);

                return (
                  <li
                    key={effect.id}
                    className={`flex h-[26px] items-center rounded-[13px] px-2.5 text-[11px] font-bold ${color.bg} ${color.text}`}
                  >
                    {effect.name}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <div className="flex flex-col gap-8 pt-6 pb-8">
          <section className="flex flex-col gap-3">
            <div className="flex h-7 items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#202124]">무슨 역할을 하나요?</h3>
              <span className="flex h-6 items-center gap-1 rounded-[12px] bg-[#F2F0FF] px-2">
                <Icon name="sparkles" size={12} filled className="text-[#6250C5]" />
                <span className="text-[11px] font-semibold text-[#6250C5]">AI 요약</span>
              </span>
            </div>

            <p className="text-[14px] leading-[1.55] text-[#5F6268]">{ingredient.description}</p>

            {/*
              제형에서 맡는 배합 목적이다. 피부에 주는 효과(skinEffects)와 다른 축이라
              머리말 옆 태그와 섞지 않고 설명 아래에 따로 둔다.
            */}
            {ingredient.formulationRoles.length > 0 ? (
              <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {ingredient.formulationRoles.map((role) => (
                  <li
                    key={role.id}
                    className="flex h-[26px] items-center rounded-[13px] bg-[#F2F3F5] px-2.5 text-[11px] font-semibold text-[#4D5159]"
                  >
                    {role.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-xl border border-[#DDEAF0] bg-[#F4F8FA] px-4 py-[14px]">
            <p className="flex items-center gap-2.5">
              <Icon name="info" size={18} className="shrink-0 text-[#3E8FB7]" />
              <span className="text-[13px] leading-[1.5] text-[#4F5963]">
                실제 사용감은 배합량과 함께 사용된 성분에 따라 달라질 수 있어요.
              </span>
            </p>
          </section>

          {ingredient.groupCodes.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[18px] font-bold text-[#202124]">포함된 성분군</h3>
              <ul>
                {ingredient.groupCodes.map((code) => (
                  <li
                    key={code}
                    className="flex h-12 items-center border-b border-[#E8E9EC] px-0.5 text-[14px] font-semibold text-[#202124]"
                  >
                    {EXCLUDE_CODE_LABELS[code]}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="pt-1">
            <Link
              href={`/products?includeIngredientIds=${ingredient.id}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#202124] px-4 text-[14px] leading-[1.3] font-bold text-white"
            >
              {ingredient.koreanName} 포함 제품 {ingredient.productCount.toLocaleString("ko-KR")}개 모두 보기
              <Icon name="chevron-right" size={18} className="shrink-0" />
            </Link>
          </section>
        </div>

        <section className="pb-6">
          <div className="flex gap-3 rounded-xl bg-[#F4F5F6] p-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-[#E8F5F0]">
              <Icon name="badge-check" size={16} className="text-[#2C9A72]" />
            </span>

            <div className="flex flex-1 flex-col gap-3">
              <h3 className="text-[14px] font-bold text-[#202124]">정보 출처 및 안내</h3>

              <p className="text-[12px] leading-[1.45] text-[#5F6268]">
                성분의 일반적인 정보와 알려진 효과를 이해하기 위한 참고 자료예요. 개인의 피부 반응은 다를 수 있어요.
              </p>

              {ingredient.infoSources.length > 0 ? (
                <p className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#3C3F44]">성분 정보 출처</span>
                  <span className="text-[11px] leading-[1.4] text-[#72747A]">{ingredient.infoSources.join(" · ")}</span>
                </p>
              ) : null}

              {ingredient.effectSources.length > 0 ? (
                <p className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#3C3F44]">성분 효과 출처</span>
                  <span className="text-[11px] leading-[1.4] text-[#72747A]">
                    {ingredient.effectSources.join(" · ")}
                  </span>
                </p>
              ) : null}

              <p className="text-[10px] text-[#8B8D94]">정보 업데이트 · {updatedAt}</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
