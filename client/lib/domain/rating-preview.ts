import type {
  IngredientAnalysisPreviewResponse,
  IngredientAnalysisReason,
  IngredientAnalysisResponse,
  RatingPreference,
} from "@poudy/api/api.zod";

import { analysisGroups } from "./shelf";

/**
 * 평가 시트의 결과 미리보기(#1125). 서버가 평가 없음 · 잘 맞았어요 · 안 맞았어요 세 결과를 미리 계산해 주면,
 * 고른 평가의 결과를 보여 주고 앞 결과와 비교해 칩이 더해지고 빠지는 움직임을 정한다.
 */

export type PreviewResult = {
  readonly analysis: IngredientAnalysisResponse;
  /** 피부 타입을 모른 채 건성 · 지성 · 민감성 후보까지 넓게 잡은 예상 후보인지 */
  readonly estimated: boolean;
};

/**
 * 고른 평가의 결과. 피부 타입을 넣지 않은 회원이 안 맞았어요를 고르면,
 * 빠른 제외 성분 유무와 관계없이 넓혀 계산한 예상 후보(ratedBadAcrossSkinTypes)를 보여 준다. 비로그인은 원래 모든 후보로 계산하므로 늘 예상 후보다.
 */
export const previewResultOf = (
  preview: IngredientAnalysisPreviewResponse,
  preference: RatingPreference | null,
  guest: boolean,
): PreviewResult => {
  if (preference === "GOOD") return { analysis: preview.ratedGood, estimated: guest };
  if (preference === "BAD") {
    const widened = preview.ratedBadAcrossSkinTypes;
    if (widened) {
      return { analysis: widened, estimated: true };
    }
    return { analysis: preview.ratedBad, estimated: guest };
  }
  return { analysis: preview.withoutRating, estimated: guest };
};

export type PreviewChip = {
  readonly key: string;
  readonly id: number;
  readonly name: string;
  /** 이 성분이 든 안 맞은 제품 수 */
  readonly count: number;
};

export type PreviewGroup = {
  readonly code: IngredientAnalysisReason;
  readonly name: string;
  readonly chips: readonly PreviewChip[];
};

/**
 * 결과를 선정 근거(빠른 제외 · 건성 · 지성 · 민감성)로 나눈다(#1121). 한 성분이 여러 근거에 들면 묶음마다 칩이 하나씩이라,
 * 칩은 묶음과 성분을 함께 가리킨다.
 */
export const previewGroupsOf = (analysis: IngredientAnalysisResponse): readonly PreviewGroup[] =>
  analysisGroups(analysis.items).map(({ reason, items }) => ({
    code: reason.code,
    name: reason.name,
    chips: items.map((item) => ({
      key: `${reason.code}:${item.id}`,
      id: item.id,
      name: item.koreanName,
      count: item.products.length,
    })),
  }));

/** stay 그대로 · enter 새로 나타남 · leave 빠지는 중 · bump 개수가 바뀜 */
export type ChipPhase = "stay" | "enter" | "leave" | "bump";

export type DisplayChip = PreviewChip & {
  readonly phase: ChipPhase;
  /**
   * 같은 움직임(나타남 · 커짐) 안에서의 순번. 묶음을 넘어 이어지며 차례로 움직이게 지연을 정한다.
   * 나타나거나 커지지 않는 칩은 0 이다.
   */
  readonly order: number;
  /** 앞 결과의 개수. 커지는 칩은 자기 차례에 이 값에서 새 개수로 바뀐다. */
  readonly previousCount: number;
};

export type DisplayGroup = {
  readonly code: IngredientAnalysisReason;
  readonly name: string;
  readonly chips: readonly DisplayChip[];
  /** 다음 결과에 없는 묶음. 칩이 모두 빠지면 묶음째 사라진다. */
  readonly leaving: boolean;
};

const REASON_ORDER: readonly IngredientAnalysisReason[] = ["QUICK_EXCLUDE", "DRY_SKIN", "OILY_SKIN", "SENSITIVE_SKIN"];

/** 처음 그릴 때. 움직임 없이 그대로 둔다. */
export const displayChipsOf = (chips: readonly PreviewChip[]): readonly DisplayChip[] =>
  chips.map((chip) => ({ ...chip, phase: "stay" as const, order: 0, previousCount: chip.count }));

export const displayGroupsOf = (groups: readonly PreviewGroup[]): readonly DisplayGroup[] =>
  groups.map((group) => ({ ...group, leaving: false, chips: displayChipsOf(group.chips) }));

const phaseOf = (chip: PreviewChip, previous: PreviewChip | undefined): ChipPhase => {
  if (!previous) return "enter";
  if (previous.count !== chip.count) return "bump";
  return "stay";
};

type UnnumberedChip = Omit<DisplayChip, "order">;

/** 빠지는 칩을 앞 결과에서 있던 자리에 다시 끼운다. 자리가 그대로여야 빠지는 동안 옆 칩이 먼저 움직이지 않는다. */
const withLeaving = (
  chips: readonly UnnumberedChip[],
  previous: readonly PreviewChip[],
  nextKeys: ReadonlySet<string>,
): readonly UnnumberedChip[] =>
  previous.reduce<readonly UnnumberedChip[]>((merged, chip, index) => {
    if (nextKeys.has(chip.key)) return merged;
    const position = Math.min(index, merged.length);
    const leaving = { ...chip, phase: "leave" as const, previousCount: chip.count };
    return [...merged.slice(0, position), leaving, ...merged.slice(position)];
  }, chips);

type Counters = { readonly enter: number; readonly bump: number };

/** 나타나는 칩과 커지는 칩에 각각 차례로 순번을 매긴다. 앞 묶음에서 센 수(start)에 이어 센다. */
const numberMoving = (
  chips: readonly UnnumberedChip[],
  start: Counters,
): { readonly chips: readonly DisplayChip[]; readonly counters: Counters } =>
  chips.reduce<{ readonly chips: readonly DisplayChip[]; readonly counters: Counters }>(
    ({ chips: numbered, counters }, chip) => {
      if (chip.phase === "enter") {
        return {
          chips: [...numbered, { ...chip, order: counters.enter }],
          counters: { ...counters, enter: counters.enter + 1 },
        };
      }
      if (chip.phase === "bump") {
        return {
          chips: [...numbered, { ...chip, order: counters.bump }],
          counters: { ...counters, bump: counters.bump + 1 },
        };
      }
      return { chips: [...numbered, { ...chip, order: 0 }], counters };
    },
    { chips: [], counters: start },
  );

const unnumberedTransition = (current: readonly DisplayChip[], next: readonly PreviewChip[]) => {
  const previous = current.filter((chip) => chip.phase !== "leave");
  const nextKeys = new Set(next.map((chip) => chip.key));
  return withLeaving(
    next.map((chip) => {
      const before = previous.find((saved) => saved.key === chip.key);
      return { ...chip, phase: phaseOf(chip, before), previousCount: before?.count ?? chip.count };
    }),
    previous,
    nextKeys,
  );
};

/**
 * 지금 그린 칩에서 다음 결과로 넘어갈 때의 칩 상태. 앞에 없던 칩은 나타나고, 개수가 바뀐 칩은 커지고,
 * 다음에 없는 칩은 빠진다. 빠지는 중이던 칩은 이미 없는 것으로 본다.
 */
export const transitionChips = (
  current: readonly DisplayChip[],
  next: readonly PreviewChip[],
): readonly DisplayChip[] => numberMoving(unnumberedTransition(current, next), { enter: 0, bump: 0 }).chips;

/**
 * 지금 그린 묶음에서 다음 결과로 넘어갈 때의 칩 상태. 묶음 안에서는 transitionChips 와 같고,
 * 다음 결과에 없는 묶음은 칩이 모두 빠지며 사라진다. 묶음 순서는 근거 순서를 지킨다.
 */
export const transitionGroups = (
  current: readonly DisplayGroup[],
  next: readonly PreviewGroup[],
): readonly DisplayGroup[] =>
  REASON_ORDER.reduce<{ readonly groups: readonly DisplayGroup[]; readonly counters: Counters }>(
    (state, code) => {
      const before = current.find((group) => group.code === code && !group.leaving);
      const after = next.find((group) => group.code === code);
      const numbered = numberMoving(unnumberedTransition(before?.chips ?? [], after?.chips ?? []), state.counters);
      if (numbered.chips.length === 0) return state;
      const group = { code, name: after?.name ?? before?.name ?? code, leaving: !after, chips: numbered.chips };
      return { groups: [...state.groups, group], counters: numbered.counters };
    },
    { groups: [], counters: { enter: 0, bump: 0 } },
  ).groups;

/** 빠지는 움직임이 끝난 뒤. 빠진 칩만 지운다. 새로 나타난 칩은 새 성분 표시를 그대로 둔다. */
export const settleChips = (chips: readonly DisplayChip[]): readonly DisplayChip[] =>
  chips.filter((chip) => chip.phase !== "leave");

export const settleGroups = (groups: readonly DisplayGroup[]): readonly DisplayGroup[] =>
  groups
    .map((group) => ({ ...group, chips: settleChips(group.chips) }))
    .filter((group) => !group.leaving && group.chips.length > 0);

export const hasLeavingChip = (groups: readonly DisplayGroup[]): boolean =>
  groups.some((group) => group.chips.some((chip) => chip.phase === "leave"));

/** 몇 개가 차례로 나타나는지. 마지막 칩이 다 나타난 뒤에 정리하려고 쓴다. */
export const enteringChipCount = (groups: readonly DisplayGroup[]): number =>
  groups.reduce((count, group) => count + group.chips.filter((chip) => chip.phase === "enter").length, 0);

const ingredientIdsOf = (analysis: IngredientAnalysisResponse): ReadonlySet<number> =>
  new Set(analysis.items.map((item) => item.id));

/**
 * 잘 맞았어요로 결과에서 빠지는 성분이 없는지. 안 맞은 제품이 없어 결과가 비었거나, 결과에 이 제품 성분이 없을 때다.
 * 이때는 이 제품에 든 주의 성분이 '나에게 괜찮았던 성분'으로 들어가는 모습을 대신 보여 준다.
 */
export const removesNothingWhenSuited = (preview: IngredientAnalysisPreviewResponse): boolean => {
  const suited = ingredientIdsOf(preview.ratedGood);
  return preview.withoutRating.items.every((item) => suited.has(item.id));
};

/** 제품 수가 바뀌어도 성분·근거·포함 제품 수가 같으면 기존 후보는 그대로다. */
export const hasSamePreviewCandidates = (
  before: IngredientAnalysisResponse,
  after: IngredientAnalysisResponse,
): boolean =>
  before.items.length === after.items.length &&
  before.items.every((item) =>
    after.items.some(
      (next) =>
        next.id === item.id &&
        next.products.length === item.products.length &&
        next.reasons.length === item.reasons.length &&
        item.reasons.every((reason) => next.reasons.some((candidate) => candidate.code === reason.code)),
    ),
  );

export type CaptionParts = {
  readonly before: string;
  /** 강조할 낱말. 안 맞았어요는 빨강, 잘 맞았어요는 초록이다. */
  readonly emphasis?: string;
  readonly after: string;
  readonly tone?: "danger" | "success";
};

/** 카드 제목 아래 한 줄(시안 02). 지금 고른 평가로 무엇이 달라지는지 말한다. */
export const previewCaptionParts = (preference: RatingPreference | null, result: PreviewResult): CaptionParts => {
  const count = result.analysis.badProductCount;
  if (preference === "BAD") {
    return {
      before: "안 맞은 제품 ",
      emphasis: `${count}개`,
      after: " 기준 · 이 제품에 든 성분이 더해져요",
      tone: "danger",
    };
  }
  if (preference === "GOOD") {
    return { before: "잘 맞은 제품에도 든 성분은 ", emphasis: "후보에서 빠져요", after: "", tone: "success" };
  }
  if (count === 0) return { before: "안 맞았던 제품을 평가하면 겹치는 성분을 찾아요", after: "" };
  return { before: `지금 결과 · 안 맞은 제품 ${count}개 기준`, after: "" };
};

export const previewCaption = (preference: RatingPreference | null, result: PreviewResult): string => {
  const { before, emphasis, after } = previewCaptionParts(preference, result);
  return `${before}${emphasis ?? ""}${after}`;
};

/** 시트 위 미리보기는 대화 상자 밖이라 낭독되지 않는다. 시트 안에서 같은 내용을 한 줄로 알린다. */
export const previewAnnouncement = (
  preference: RatingPreference | null,
  result: PreviewResult,
  preview: IngredientAnalysisPreviewResponse,
): string => {
  if (preference === "GOOD" && removesNothingWhenSuited(preview) && preview.productCautionIngredients.length > 0) {
    return `잘 맞은 제품의 성분. 나에게 괜찮았던 성분 ${preview.productCautionIngredients.length}개.`;
  }
  const count = result.analysis.items.length;
  if (preference === "BAD" && hasSamePreviewCandidates(preview.withoutRating, result.analysis)) {
    if (count === 0) return "변경된 게 없어요.";
    return `변경된 게 없어요. 안 맞을 수 있는 성분 ${count}개.`;
  }
  const caption = previewCaption(preference, result);
  if (count === 0) return `${caption}. 안 맞을 수 있는 성분이 없어요.`;
  return `${caption}. 안 맞을 수 있는 성분 ${count}개.`;
};
