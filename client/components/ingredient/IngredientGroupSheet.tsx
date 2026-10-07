"use client";

import type { ProductIngredientResponse, SkinEffectResponse } from "@poudy/api/api.zod";
import Link from "next/link";

import { EffectTag } from "./EffectTag";
import { RoleDescription, SheetDetailLink, SheetHead } from "./SheetParts";

import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/icons/Icon";
import { fetchIngredientGroup } from "@/lib/api/products";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { useSheetDescription } from "@/lib/hooks/useSheetDescription";

/** 제품 안에서 본 성분군. 제품에 든 성분과 그 성분군이 묶인 쓰임새만 담는다. */
export type ProductIngredientGroup = {
  readonly code: string;
  readonly name: string;
  readonly ingredients: readonly ProductIngredientResponse[];
  readonly effects: readonly Pick<SkinEffectResponse, "code" | "name">[];
};

/**
 * S24a 성분군 시트. `세라마이드 5종` 칩을 누르면 성분군이 무엇이고 이 제품에 어느 성분이 들었는지 보여 준다.
 *
 * 성분군 전체가 아니라 이 제품에 든 성분만 늘어놓는다. 성분군의 모든 성분은 성분군 설명 화면에서 본다.
 */
export function IngredientGroupSheet({
  open,
  group,
  onClose,
}: {
  readonly open: boolean;
  readonly group: ProductIngredientGroup | undefined;
  readonly onClose: () => void;
}) {
  return (
    <BottomSheet open={open && group !== undefined} onClose={onClose}>
      {group ? <Content group={group} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function Content({ group, onClose }: { readonly group: ProductIngredientGroup; readonly onClose: () => void }) {
  const detail = useSheetDescription(group.code, () => fetchIngredientGroup(group.code));
  const name = groupDisplayName(group.name);

  const description = (() => {
    if (detail.status === "loaded") return { status: "loaded", value: detail.value.description } as const;
    return detail;
  })();

  return (
    <>
      <SheetHead
        title={name}
        badge={<Badge variant="count">{group.ingredients.length}종</Badge>}
        englishName={detail.status === "loaded" ? detail.value.englishName : undefined}
        tags={
          group.effects.length > 0 ? (
            <ul aria-label="피부 작용" className="flex flex-wrap items-center gap-2">
              {group.effects.map((effect) => (
                <li key={effect.code}>
                  <EffectTag effect={effect} />
                </li>
              ))}
            </ul>
          ) : null
        }
        onClose={onClose}
      />

      <BottomSheet.Body>
        <div className="flex flex-col gap-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <RoleDescription description={description} />

          <section className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold text-[#182132]">이 제품에 든 성분</h3>
            <ul>
              {group.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="border-b border-[#DEE2E9] last:border-b-0">
                  <Link
                    href={`/ingredients/${ingredient.id}`}
                    className="flex min-h-[60px] items-center justify-between gap-2 py-2"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[14px] font-semibold text-[#182132]">{ingredient.koreanName}</span>
                      <span className="text-[12px] text-[#6A7588]">{ingredient.englishName}</span>
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-[#6A7588]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <SheetDetailLink href={`/ingredient-groups/${encodeURIComponent(group.code)}`}>
            {name} 성분군 자세히 보기
          </SheetDetailLink>
        </div>
      </BottomSheet.Body>
    </>
  );
}
