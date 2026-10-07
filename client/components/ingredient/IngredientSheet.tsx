"use client";

import type { ProductIngredientResponse } from "@poudy/api/api.zod";

import { EffectTag } from "./EffectTag";
import { RoleDescription, SheetDetailLink, SheetHead } from "./SheetParts";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { fetchIngredientDetail } from "@/lib/api/products";
import { useSheetDescription } from "@/lib/hooks/useSheetDescription";

/**
 * S24b 성분 시트. 제품 상세에서 성분 칩을 누르면 화면을 떠나지 않고 성분의 역할을 보여 준다.
 *
 * 이름·태그·배합 목적은 제품 응답에 이미 있어 바로 그리고, 설명만 시트를 연 뒤에 받아 온다.
 */
export function IngredientSheet({
  open,
  ingredient,
  onClose,
}: {
  readonly open: boolean;
  readonly ingredient: ProductIngredientResponse | undefined;
  readonly onClose: () => void;
}) {
  return (
    <BottomSheet open={open && ingredient !== undefined} onClose={onClose}>
      {ingredient ? <Content ingredient={ingredient} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function Content({
  ingredient,
  onClose,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly onClose: () => void;
}) {
  const description = useSheetDescription(String(ingredient.id), () =>
    fetchIngredientDetail(ingredient.id).then((detail) => detail.description),
  );

  return (
    <>
      <SheetHead
        title={ingredient.koreanName}
        englishName={ingredient.englishName}
        tags={
          ingredient.skinEffects.length > 0 ? (
            <ul aria-label="피부 작용" className="flex flex-wrap items-center gap-2">
              {ingredient.skinEffects.map((effect) => (
                <li key={effect.id}>
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
          <RoleDescription description={description}>
            {ingredient.formulationRoles.length > 0 ? (
              <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-2">
                {ingredient.formulationRoles.map((role) => (
                  <li
                    key={role.id}
                    className="flex h-[26px] items-center rounded-[13px] bg-[#EFF1F5] px-3 text-[11px] font-semibold text-[#424E5F]"
                  >
                    {role.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </RoleDescription>

          <SheetDetailLink href={`/ingredients/${ingredient.id}`}>{ingredient.koreanName} 자세히 보기</SheetDetailLink>
        </div>
      </BottomSheet.Body>
    </>
  );
}
