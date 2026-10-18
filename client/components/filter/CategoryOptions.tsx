"use client";

import type { CategoryResponse } from "@poudy/api/api.zod";
import { Disclosure, DisclosureContent, DisclosureGroup, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { Icon } from "@poudy/design-system/icon";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { useState } from "react";

type CategoryOptionsProps = {
  readonly categories: readonly CategoryResponse[];
  readonly selectedIds: readonly number[];
  readonly onSelect: (categoryIds: readonly number[]) => void;
};

/** 라디오 값. 대분류 전체는 `all-{대분류}`, 소분류는 `{소분류}` 다. */
const ALL_PREFIX = "all-";

/** 고른 ID 들을 라디오 값 하나로 바꾼다. 대분류의 소분류를 모두 골랐으면 전체, 소분류 하나면 그 소분류다. */
const selectedValueOf = (categories: readonly CategoryResponse[], ids: readonly number[]): string | undefined => {
  const whole = categories.find(
    (category) =>
      category.children.length > 0 &&
      category.children.length === ids.length &&
      category.children.every((child) => ids.includes(child.id)),
  );
  if (whole) return `${ALL_PREFIX}${whole.id}`;
  if (ids.length === 1) return String(ids[0]);
  return undefined;
};

const idsOf = (categories: readonly CategoryResponse[], value: string): readonly number[] => {
  if (!value.startsWith(ALL_PREFIX)) return [Number(value)];
  const parentId = Number(value.slice(ALL_PREFIX.length));
  return categories.find((category) => category.id === parentId)?.children.map((child) => child.id) ?? [];
};

const ownerOf = (categories: readonly CategoryResponse[], ids: readonly number[]) =>
  categories.find((category) => category.children.some((child) => ids.includes(child.id)));

/**
 * 카테고리 시트(명세 S23c). 대분류마다 묶음 머리 행을 두고, 펼친 대분류에서 하나를 고른다(단일 선택).
 * 대분류는 한 번에 하나만 펼친다(DisclosureGroup single). 처음에는 고른 것이 있는 대분류, 없으면 첫 대분류를 펼친다.
 */
export function CategoryOptions({ categories, selectedIds, onSelect }: CategoryOptionsProps) {
  const [expanded, setExpanded] = useState<string | undefined>(() => {
    const owner = ownerOf(categories, selectedIds) ?? categories[0];
    return owner ? String(owner.id) : undefined;
  });
  const selected = selectedValueOf(categories, selectedIds);

  return (
    <DisclosureGroup type="single" value={expanded} onValueChange={setExpanded}>
      <div className="flex flex-col">
        {categories.map((category) => (
          <CategoryGroup
            key={category.id}
            category={category}
            open={expanded === String(category.id)}
            selected={selected}
            onSelect={(value) => onSelect(idsOf(categories, value))}
          />
        ))}
      </div>
    </DisclosureGroup>
  );
}

/**
 * 대분류 묶음(명세 APP · 묶음 머리 행 · 펼침 · 접힘). 펼치면 ui-surface 면 + 아래 꺾쇠, 접으면 위 구분선 + 오른쪽 꺾쇠다.
 * 행 모양은 이 도메인 컴포넌트가, 펼침 동작은 Disclosure 가 맡는다.
 */
function CategoryGroup({
  category,
  open,
  selected,
  onSelect,
}: {
  readonly category: CategoryResponse;
  readonly open: boolean;
  readonly selected: string | undefined;
  readonly onSelect: (value: string) => void;
}) {
  return (
    <Disclosure value={String(category.id)}>
      <DisclosureTrigger>
        <button
          type="button"
          className={
            open
              ? "fb-border flex h-12 w-full items-center justify-between rounded-md bg-surface px-3 text-left text-title font-semibold text-text-primary"
              : "fb-surface flex h-12 w-full items-center justify-between border-t border-border px-3 text-left text-title font-semibold text-text-primary"
          }
        >
          {category.name}
          {open ? (
            <Icon name="chevron-down" size={16} className="text-text-body" />
          ) : (
            <Icon name="chevron-right" size={16} className="text-text-muted" />
          )}
        </button>
      </DisclosureTrigger>
      <DisclosureContent>
        <RadioGroup aria-label={category.name} variant="list" value={selected} onValueChange={onSelect}>
          <RadioGroupItem value={`${ALL_PREFIX}${category.id}`}>전체</RadioGroupItem>
          {category.children.map((child) => (
            <RadioGroupItem key={child.id} value={String(child.id)}>
              {child.name}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </DisclosureContent>
    </Disclosure>
  );
}
