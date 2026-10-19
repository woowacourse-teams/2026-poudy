"use client";

import type { ProductIngredientResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Tag } from "@poudy/design-system/tag";

import { closeMethodOf, EffectTags, RoleDescription, SheetDetailLink } from "./SheetParts";

import type { SheetCloseMethod } from "@/lib/analytics/events";
import { fetchIngredientDetail } from "@/lib/api/products";
import { formatEnglishName } from "@/lib/domain/format";
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
  /** 닫은 방법을 함께 넘긴다. 시트를 연 쪽이 분석에 남긴다. */
  readonly onClose: (method: SheetCloseMethod) => void;
}) {
  return (
    <BottomSheet open={open && ingredient !== undefined} onClose={(reason) => onClose(closeMethodOf(reason))}>
      {ingredient ? <Content ingredient={ingredient} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function Content({
  ingredient,
  onClose,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly onClose: (method: SheetCloseMethod) => void;
}) {
  const description = useSheetDescription(String(ingredient.id), () =>
    fetchIngredientDetail(ingredient.id).then((detail) => detail.description),
  );

  return (
    <>
      <BottomSheetHeader
        title={ingredient.koreanName}
        description={ingredient.englishName ? formatEnglishName(ingredient.englishName) : undefined}
        onClose={() => onClose("close_button")}
      />

      <BottomSheetBody>
        <div className="flex flex-col gap-6 pb-2">
          <EffectTags effects={ingredient.skinEffects} />
          <RoleDescription description={description}>
            {ingredient.formulationRoles.length > 0 ? (
              <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-2">
                {ingredient.formulationRoles.map((role) => (
                  <li key={role.id}>
                    <Tag variant="label" tone="muted">
                      {role.name}
                    </Tag>
                  </li>
                ))}
              </ul>
            ) : null}
          </RoleDescription>
        </div>
      </BottomSheetBody>

      <SheetDetailLink
        href={`/ingredients/${ingredient.id}?from=ingredient_sheet`}
        onClick={() => onClose("detail_link")}
      >
        {ingredient.koreanName} 자세히 보기
      </SheetDetailLink>
    </>
  );
}
