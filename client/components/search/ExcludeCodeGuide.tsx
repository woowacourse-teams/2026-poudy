import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import Link from "next/link";

import { Icon } from "@/components/ui/icons/Icon";

/** 빠른 필터 이름은 `… 제외` 로 끝난다. 여기서는 무엇을 담은 묶음인지만 말한다. */
const groupName = (name: string): string => name.replace(/\s*제외$/, "");

/**
 * 빠른 필터의 성분군마다 어떤 성분이 드는지.
 *
 * 무엇을 빼는 필터인지 궁금한 사람이 펼쳐 보는 자리라 접어 둔다. 접혀 있어도 링크는 문서에
 * 남아 있어, 크롤러가 이 화면에서 성분 페이지로 건너간다. 조건과 무관해 서버가 그대로 그린다.
 */
export function ExcludeCodeGuide({ excludeCodes }: { readonly excludeCodes: readonly ExcludeCodeResponse[] }) {
  if (excludeCodes.length === 0) return null;

  return (
    <section className="flex flex-col gap-1 px-4 pb-5">
      <h2 className="px-0.5 text-[15px] font-bold text-[#212124]">성분군에 드는 성분</h2>

      <ul className="divide-y divide-divider">
        {excludeCodes.map((code) => (
          <li key={code.code}>
            <details className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-0.5 [&::-webkit-details-marker]:hidden">
                <span className="text-[13px] font-semibold text-[#4D5159]">{groupName(code.name)}</span>
                <span className="text-[12px] font-medium text-[#868B94]">{code.ingredients.length}개</span>
                <Icon
                  name="chevron-down"
                  size={16}
                  className="ml-auto text-text-secondary transition-transform group-open:rotate-180"
                />
              </summary>

              <p className="px-0.5 pt-2 text-[12px] text-[#72747A]">{code.description}</p>

              <ul className="flex flex-wrap gap-1.5 pt-2">
                {code.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <Link
                      href={`/ingredients/${ingredient.id}`}
                      prefetch={false}
                      className="inline-flex rounded-full border border-[#DDE0E4] px-2.5 py-1 text-[12px] text-[#4D5159]"
                    >
                      {ingredient.koreanName}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
