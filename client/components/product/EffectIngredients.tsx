"use client";

import type { SkinEffectItemResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";

/**
 * 피부 작용 한 줄의 성분 칩. 같은 성분군은 `세라마이드 2종` 칩 하나로 묶고, 누르면 속한 성분을 펼친다.
 *
 * 펼치지 않은 성분군의 성분도 목록에 그려 두고 보이기만 감춘다. 전성분 목록과 같은 이유로,
 * 눌러야 만들어지는 링크는 검색 로봇이 받는 첫 HTML 에 남지 않는다.
 */
export function EffectIngredients({
  rowId,
  items,
}: {
  readonly rowId: string;
  readonly items: readonly SkinEffectItemResponse[];
}) {
  const [openCode, setOpenCode] = useState<string | undefined>(undefined);

  const toggle = (code: string) => {
    if (openCode === code) {
      setOpenCode(undefined);
      return;
    }
    setOpenCode(code);
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <span className="flex min-h-[30px] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-[#202124]">
        {items.map((item) => (
          <EffectChip
            key={chipKey(item)}
            rowId={rowId}
            item={item}
            open={item.ingredientGroup?.code === openCode}
            onToggle={toggle}
          />
        ))}
      </span>

      {items.map((item) => (
        <BundlePanel key={chipKey(item)} rowId={rowId} item={item} open={item.ingredientGroup?.code === openCode} />
      ))}
    </div>
  );
}

const chipKey = (item: SkinEffectItemResponse) => item.ingredientGroup?.code ?? `ingredient-${item.ingredients[0]?.id}`;

function EffectChip({
  rowId,
  item,
  open,
  onToggle,
}: {
  readonly rowId: string;
  readonly item: SkinEffectItemResponse;
  readonly open: boolean;
  readonly onToggle: (code: string) => void;
}) {
  const group = item.ingredientGroup;
  const ingredient = item.ingredients[0];

  if (group) {
    return (
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId(rowId, group.code)}
        onClick={() => onToggle(group.code)}
        className="ingredient-chip-link flex items-center gap-0.5"
      >
        {bundleLabel(group.name, item.ingredients.length)}
        <Icon name={chevronOf(open)} size={14} className="text-text-secondary" />
      </button>
    );
  }
  if (!ingredient) return null;

  return (
    <Link href={`/ingredients/${ingredient.id}`} prefetch="auto" className="ingredient-chip-link">
      {ingredient.koreanName}
    </Link>
  );
}

function BundlePanel({
  rowId,
  item,
  open,
}: {
  readonly rowId: string;
  readonly item: SkinEffectItemResponse;
  readonly open: boolean;
}) {
  const group = item.ingredientGroup;
  if (!group) return null;

  return (
    <div id={panelId(rowId, group.code)} hidden={!open} className="rounded-xl bg-surface-subtle px-3.5 py-2">
      <p className="py-1.5 text-[13px] font-bold text-text-primary">{group.name}</p>
      <ul>
        {item.ingredients.map((ingredient) => (
          <li key={ingredient.id} className="border-t border-border">
            <Link
              href={`/ingredients/${ingredient.id}`}
              prefetch="auto"
              className="flex min-h-10 items-center justify-between text-[13px] text-text-primary"
            >
              {ingredient.koreanName}
              <Icon name="chevron-right" size={14} className="text-text-secondary" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 성분군 이름의 `계열` 은 칩에서 뺀다. `세라마이드 계열 2종` 보다 `세라마이드 2종` 이 짧고 뜻이 같다. */
const bundleLabel = (groupName: string, count: number) => `${groupName.replace(/\s*계열$/, "")} ${count}종`;

const panelId = (rowId: string, code: string) => `ingredient-group-${rowId}-${code}`;

const chevronOf = (open: boolean) => {
  if (open) return "chevron-up";
  return "chevron-down";
};
