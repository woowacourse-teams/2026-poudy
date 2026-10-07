import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiSummaryBadge } from "@/components/ingredient/AiSummaryBadge";
import { Icon } from "@/components/ui/icons/Icon";
import { ShareButton } from "@/components/ui/ShareButton";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchIngredientGroup } from "@/lib/api/products";
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

/** S25a 성분군 설명. 문구와 구조는 design/v2.pen 을 따른다. */
export default async function IngredientGroupPage(props: PageProps<"/ingredient-groups/[groupCode]">) {
  const { groupCode } = await props.params;
  const group = await load(decodeURIComponent(groupCode));
  const name = groupDisplayName(group.name);

  return (
    <>
      <TopBar title="성분군 설명" variant="sub" right={<ShareButton />} />

      {/* 성분 설명과 같이 화면 전체가 성분 정보라 본문째 선택을 막는다. */}
      <main data-no-select className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-6">
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 text-[20px] font-bold text-[#182132]">{name}</h2>
            <span className="flex h-[26px] shrink-0 items-center rounded-[13px] bg-[#EFF1F5] px-3 text-[12px] font-semibold text-[#566273]">
              {group.ingredients.length}종
            </span>
          </div>
          {group.englishName ? <p className="text-[13px] text-[#6A7588]">{group.englishName}</p> : null}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex h-7 items-center justify-between">
            <h3 className="text-[18px] font-bold text-[#182132]">무슨 역할을 하나요?</h3>
            <AiSummaryBadge />
          </div>
          <p className="text-pretty text-[15px] leading-[1.6] text-[#424E5F]">{group.description}</p>
        </section>

        <Link
          href={`/products?includeGroupCodes=${encodeURIComponent(group.code)}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#182132] px-4 text-[14px] font-bold text-white"
        >
          <span className="truncate">{name} 성분군 포함 제품 보기</span>
          <Icon name="chevron-right" size={16} className="shrink-0" />
        </Link>

        {group.ingredients.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-[18px] font-bold text-[#182132]">이 성분군에 포함된 성분</h3>
            <ul>
              {group.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="border-b border-[#DEE2E9] last:border-b-0">
                  <Link
                    href={`/ingredients/${ingredient.id}`}
                    className="flex min-h-[60px] items-center justify-between gap-2 py-2"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[15px] font-semibold text-[#182132]">{ingredient.koreanName}</span>
                      {ingredient.englishName ? (
                        <span className="text-[13px] text-[#566273]">{ingredient.englishName}</span>
                      ) : null}
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-[#6A7588]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
