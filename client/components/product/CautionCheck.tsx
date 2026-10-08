"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState } from "react";

import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { scalableIconStyle } from "@/components/ui/icons/Icon";
import { openInPlace } from "@/components/ui/open-in-place";
import { PRESS_SURFACE_OUTSET } from "@/components/ui/press";
import { slashBreakable } from "@/components/ui/slash-breakable";
import { type CautionGroup, cautionSummary, sortedCautions } from "@/lib/domain/caution-check";

type Ingredients = ProductPartResponse["ingredients"];

/**
 * 주의 성분 확인. 기준마다 공개 전성분에 들었는지를 두 칸 격자로 보여 준다.
 * 들어 있는 기준을 앞에 두어 눈이 먼저 닿게 한다.
 *
 * 기준을 누르면 성분군 시트를 열어 그 기준이 무엇인지와 이 제품에 든 해당 성분을 보여 준다.
 * 쓰임새별 성분의 성분군 칩과 같은 시트다. 성분군 코드를 찾지 못한 기준은 누를 수 없게 둔다.
 */
export function CautionCheck({
  groups,
  ingredients,
}: {
  readonly groups: readonly CautionGroup[];
  readonly ingredients: Ingredients;
}) {
  const [shown, setShown] = useState<CautionGroup>();
  // 닫는 동안에도 내용이 남아 있어야 시트가 빈 채로 내려가지 않는다. 그래서 무엇을 열었는지와 열려 있는지를 따로 둔다.
  const [open, setOpen] = useState(false);

  if (groups.length === 0) return null;

  const show = (group: CautionGroup) => {
    setShown(group);
    setOpen(true);
  };

  return (
    <section data-no-select className="flex flex-col gap-4">
      <CautionHead groups={groups} />
      <CautionList groups={groups} onOpen={show} />
      <IngredientGroupSheet
        open={open}
        group={shown ? sheetGroupOf(shown, ingredients) : undefined}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}

function CautionHead({ groups }: { readonly groups: readonly CautionGroup[] }) {
  const summary = cautionSummary(groups);

  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[14px] font-bold text-[#182132]">주의 성분 확인</h3>
      <p className={`text-[12px] font-bold ${summary.contains ? "text-[#C53030]" : "text-[#0A6B52]"}`}>
        {summary.label}
      </p>
    </div>
  );
}

function CautionList({
  groups,
  onOpen,
}: {
  readonly groups: readonly CautionGroup[];
  readonly onOpen: (group: CautionGroup) => void;
}) {
  return (
    /*
      이름 길이가 제각각이라 흘려 놓으면 줄마다 끝이 들쭉날쭉하다. 두 칸 격자로 줄을 맞춘다.
      서버는 기준 이름만 주므로 "있음"·"없음" 은 화면에서 붙인다.

      칸 수를 글자 크기로 정한다. 1배에서는 두 칸이지만, 글자를 키워 한 칸이 130px(글자 기준)보다
      좁아지면 한 칸으로 바뀐다. 두 칸에 억지로 담으면 긴 이름이 낱말 가운데서 갈라진다.
      한 칸의 최소 폭을 절반 아래로는 두지 않아, 화면이 넓어도 세 칸으로 늘지 않는다.
    */
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(max(min(100%,calc(130em/14)),calc((100%_-_12px)/2)),1fr))] gap-3 text-[14px]">
      {sortedCautions(groups).map((group) => (
        <li key={group.name} className="flex">
          <CautionItem group={group} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function CautionItem({
  group,
  onOpen,
}: {
  readonly group: CautionGroup;
  readonly onOpen: (group: CautionGroup) => void;
}) {
  const { code } = group;
  if (!code) {
    return (
      <span className="flex items-center gap-2">
        <CautionLabel group={group} />
      </span>
    );
  }

  return (
    <Link
      href={`/ingredient-groups/${encodeURIComponent(code)}`}
      onClick={(event) => openInPlace(event, () => onOpen(group))}
      className={`flex flex-1 items-center gap-2 ${PRESS_SURFACE_OUTSET}`}
    >
      <CautionLabel group={group} />
    </Link>
  );
}

function CautionLabel({ group }: { readonly group: CautionGroup }) {
  return (
    <>
      <span
        className={`flex size-[max(20px,calc(20em/14))] shrink-0 items-center justify-center rounded-full text-white ${group.contains ? "bg-[#C53030]" : "bg-[#17A47A]"}`}
      >
        <CautionMark kind={group.contains ? "x" : "check"} />
      </span>
      <span
        className={`text-[14px] leading-[1.4] break-keep ${group.contains ? "font-semibold text-[#182132]" : "font-medium text-[#424E5F]"}`}
      >
        {/* `향료/알레르기` 처럼 빗금으로 이은 이름은 빗금 뒤에서 줄을 바꿀 수 있게 한다. */}
        {slashBreakable(group.name)} {group.contains ? "있음" : "없음"}
      </span>
    </>
  );
}

/** 성분군 시트에 넘길 것. 주의 성분 기준은 피부 작용과 묶이지 않으므로 작용 태그는 없다. */
const sheetGroupOf = (group: CautionGroup, ingredients: Ingredients): ProductIngredientGroup => {
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  return {
    code: group.code ?? "",
    name: group.name,
    ingredients: group.ingredientIds.flatMap((id) => byId.get(id) ?? []),
    effects: [],
  };
};

/**
 * 주의 성분 확인 원 안의 표시. 경로는 Tabler 의 x · check 다.
 *
 * 24 단위 viewBox 그대로 두면 check 는 그림이 오른쪽 위로 치우쳐 있어 원 안에서 가운데로 보이지 않는다.
 * viewBox 를 그림(선 굵기의 절반까지)에 딱 맞게 잘라 그림의 가운데가 상자의 가운데에 오게 한다.
 *
 * 크기는 디자인(24 단위를 13px)에 가까운 정수 px 로 둔다. 8.1px 처럼 소수로 두면 20px 원 안에서
 * 놓이는 자리가 픽셀 격자에 맞춰지며 반 픽셀쯤 밀린다. 비율이 다른 칸은 viewBox 가 가운데로 맞춰 넣는다.
 */
const MARKS = {
  x: { viewBox: "4.5 4.5 15 15", width: 8, height: 8, paths: ["M18 6l-12 12", "M6 6l12 12"] },
  check: { viewBox: "3.5 5.5 18 13", width: 10, height: 8, paths: ["M5 12l5 5l10 -10"] },
} as const;

function CautionMark({ kind }: { readonly kind: keyof typeof MARKS }) {
  const { viewBox, width, height, paths } = MARKS[kind];

  return (
    <svg
      width={width}
      height={height}
      style={scalableIconStyle(width, height)}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
