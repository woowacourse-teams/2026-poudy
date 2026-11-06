"use client";

import type { IngredientAnalysisPreviewResponse, RatingPreference } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { motionDelay, prefersReducedMotion, useMovedPositions } from "./preview-motion";
import { SuitedIngredients } from "./SuitedIngredients";

import { RollingNumber } from "@/components/ui/RollingNumber";
import {
  type DisplayChip,
  type DisplayGroup,
  displayGroupsOf,
  enteringChipCount,
  hasLeavingChip,
  hasSamePreviewCandidates,
  previewCaptionParts,
  previewGroupsOf,
  previewResultOf,
  removesNothingWhenSuited,
  settleGroups,
  transitionGroups,
} from "@/lib/domain/rating-preview";
import { ANALYSIS_EMPTY_DESCRIPTION } from "@/lib/domain/shelf";

/**
 * 시안 02 의 시간. 누르면 250ms 부터 150ms 간격으로 기존 칩의 개수가 바뀌며 커지고,
 * 650ms 부터 180ms 간격으로 새 칩이 나타난다. CSS(preview-chip-enter · preview-chip-leave)와 맞춘다.
 */
const START_MS = 250;
const ENTER_START_MS = 650;
const ENTER_STAGGER_MS = 180;
const ENTER_MS = 350;
const BUMP_STAGGER_MS = 150;
const BUMP_MS = 200;
const SUITED_LEAVE_DELAY_MS = 650;
const LEAVE_MS = 300;
/** 시트 위 자리가 좁아 묶음마다 이만큼만 칩으로 보이고 나머지는 개수로 줄인다. */
const CHIPS_PER_GROUP = 4;

type Shown = {
  readonly key: string;
  readonly choice: string;
  readonly source: IngredientAnalysisPreviewResponse;
  readonly revision: number;
  readonly groups: readonly DisplayGroup[];
  readonly suited: boolean;
};

/** 움직임이 다 끝나는 시각. 그 뒤에 빠진 칩을 지운다. */
const settleDelayOf = (groups: readonly DisplayGroup[], suited: boolean): number => {
  const enterEnd = ENTER_START_MS + Math.max(enteringChipCount(groups) - 1, 0) * ENTER_STAGGER_MS + ENTER_MS;
  if (suited) return Math.max(enterEnd, SUITED_LEAVE_DELAY_MS + LEAVE_MS);
  return Math.max(enterEnd, LEAVE_MS);
};

/** 개수가 바뀐 칩을 살짝 키웠다 되돌린다(시안 02 의 scale 1.12). 앞에서부터 차례로 움직인다. */
const useBumpedChips = (containerRef: React.RefObject<HTMLElement | null>, shown: Shown) => {
  const bumpedFor = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || bumpedFor.current === shown.key) return;
    bumpedFor.current = shown.key;
    if (prefersReducedMotion()) return;
    [...container.querySelectorAll<HTMLElement>('[data-phase="bump"]')].forEach((element) => {
      element.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], {
        duration: BUMP_MS * 2,
        delay: START_MS + Number(element.dataset.order) * BUMP_STAGGER_MS,
        easing: "ease-out",
      });
    });
  }, [containerRef, shown]);
};

/**
 * 묶음 이름 옆 개수. 새 칩이 하나씩 나타날 때마다 하나씩 올라가고, 빠지는 칩은 바로 뺀다.
 * 평가를 바꿀 때마다(shownKey) 처음부터 다시 센다.
 */
const useAppearingCount = (group: DisplayGroup, shownKey: string): number => {
  const settled = group.chips.filter((chip) => chip.phase === "stay" || chip.phase === "bump").length;
  const orders = group.chips.filter((chip) => chip.phase === "enter").map((chip) => chip.order);
  const [appeared, setAppeared] = useState({ key: shownKey, count: 0 });
  if (appeared.key !== shownKey) setAppeared({ key: shownKey, count: 0 });
  const schedule = orders.join(",");

  useEffect(() => {
    const timers = schedule
      .split(",")
      .filter((order) => order !== "")
      .map((order) =>
        window.setTimeout(
          () => setAppeared((current) => ({ ...current, count: current.count + 1 })),
          motionDelay(ENTER_START_MS + Number(order) * ENTER_STAGGER_MS),
        ),
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [shownKey, schedule]);

  return settled + Math.min(appeared.count, orders.length);
};

/**
 * 칩 색(시안 02). 평소는 분홍 면, 안 맞았어요로 더해지는 성분은 빨간 면과 테두리,
 * 잘 맞았어요로 빠지는 성분은 초록 면에 취소선이다.
 */
const toneOf = (chip: DisplayChip, suited: boolean, added: boolean): string => {
  if (chip.phase === "leave" && suited && !added) {
    return "border-success-border bg-success-soft text-success-text line-through";
  }
  if (added) return "border-danger-action bg-danger-soft text-danger-action";
  return "border-transparent bg-brand-soft text-brand-text";
};

/** 커지는 칩은 자기 차례가 올 때까지 앞 개수를 보이다가, 커지는 순간 새 개수로 바꾼다(시안 02). */
const useShownCount = (chip: DisplayChip, shownKey: string): number => {
  const [changed, setChanged] = useState({ key: shownKey, done: false });
  if (changed.key !== shownKey) setChanged({ key: shownKey, done: false });
  const bumping = chip.phase === "bump";

  useEffect(() => {
    if (!bumping) return;
    const timer = window.setTimeout(
      () => setChanged({ key: shownKey, done: true }),
      motionDelay(START_MS + chip.order * BUMP_STAGGER_MS),
    );
    return () => window.clearTimeout(timer);
  }, [bumping, chip.order, shownKey]);

  if (bumping && !changed.done) return chip.previousCount;
  return chip.count;
};

type PreviewChipItemProps = {
  readonly chip: DisplayChip;
  readonly shownKey: string;
  readonly suited: boolean;
  /** 지금 결과에 없던 성분. 안 맞았어요로 더해지는 성분이다. */
  readonly added: boolean;
};

function PreviewChipItem({ chip, shownKey, suited, added }: PreviewChipItemProps) {
  const count = useShownCount(chip, shownKey);
  let leaveDelay = "0ms";
  if (suited && !added) leaveDelay = `${SUITED_LEAVE_DELAY_MS}ms`;

  return (
    <li
      data-flip={chip.key}
      data-phase={chip.phase}
      data-order={chip.order}
      style={{ "--chip-order": chip.order, "--chip-leave-delay": leaveDelay } as React.CSSProperties}
      className={cn(
        "flex h-7 items-center gap-1 rounded-full border px-2.5 text-caption leading-none font-medium whitespace-nowrap transition-colors duration-(--duration-base)",
        chip.phase === "enter" && "preview-chip-enter",
        chip.phase === "leave" && "preview-chip-leave",
        toneOf(chip, suited, added),
      )}
    >
      {chip.name}
      <span className="text-label opacity-75">{`${count}개`}</span>
    </li>
  );
}

/** 보일 칩. 빠지는 칩은 빠지는 모습이 보이도록 늘 남긴다. */
const chipsShownIn = (chips: readonly DisplayChip[]): readonly DisplayChip[] =>
  chips.reduce<{ readonly shown: readonly DisplayChip[]; readonly kept: number }>(
    ({ shown, kept }, chip) => {
      if (chip.phase === "leave") return { shown: [...shown, chip], kept };
      if (kept >= CHIPS_PER_GROUP) return { shown, kept: kept + 1 };
      return { shown: [...shown, chip], kept: kept + 1 };
    },
    { shown: [], kept: 0 },
  ).shown;

type PreviewChipListProps = {
  readonly chips: readonly DisplayChip[];
  readonly shownKey: string;
  readonly suited: boolean;
  readonly currentIds: ReadonlySet<number>;
  readonly moreKey: string;
};

function PreviewChipList({ chips, shownKey, suited, currentIds, moreKey }: PreviewChipListProps) {
  const hidden = Math.max(chips.filter((chip) => chip.phase !== "leave").length - CHIPS_PER_GROUP, 0);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chipsShownIn(chips).map((chip) => (
        <PreviewChipItem
          key={chip.key}
          chip={chip}
          shownKey={shownKey}
          suited={suited}
          added={!currentIds.has(chip.id)}
        />
      ))}
      {hidden > 0 && (
        <li
          data-flip={`more:${moreKey}`}
          className="flex h-7 items-center px-1 text-caption leading-none font-medium text-text-secondary"
        >
          {`+${hidden}`}
        </li>
      )}
    </ul>
  );
}

type PreviewGroupBlockProps = Omit<PreviewChipListProps, "chips" | "moreKey"> & {
  readonly group: DisplayGroup;
};

/** 안 맞았어요 결과는 근거별 묶음 이름과 개수 아래에 칩을 늘어놓는다. */
function PreviewGroupBlock({ group, shownKey, suited, currentIds }: PreviewGroupBlockProps) {
  const count = useAppearingCount(group, shownKey);
  return (
    <div className="flex flex-col gap-1.5">
      <p
        data-flip={`group:${group.code}`}
        className={cn(
          "flex items-center gap-1 text-label leading-snug font-semibold text-text-secondary transition-opacity duration-(--duration-base)",
          group.leaving && "opacity-0",
        )}
      >
        {group.name}
        <RollingNumber value={count} />
      </p>
      <PreviewChipList
        chips={group.chips}
        shownKey={shownKey}
        suited={suited}
        currentIds={currentIds}
        moreKey={group.code}
      />
    </div>
  );
}

/** 잘 맞았어요에서는 피부타입 분류 대신 성분을 한 번씩만 보여 준다. */
const uniqueChipsOf = (groups: readonly DisplayGroup[]): readonly DisplayChip[] => {
  const chips = new Map<number, DisplayChip>();
  for (const group of groups) {
    for (const chip of group.chips) {
      const previous = chips.get(chip.id);
      if (!previous || previous.phase === "leave") chips.set(chip.id, chip);
    }
  }
  return [...chips.values()];
};

/** '나만의 필터' 표시. 제품 상세의 나와 안 맞는 성분 카드와 같은 모양이다. */
function PersonalTag() {
  return (
    <span className="flex h-5.5 w-fit items-center gap-1 rounded-full bg-brand-soft px-2 text-label leading-snug font-bold text-brand-text">
      <Icon name="user-check" size={12} />
      나만의 필터
    </span>
  );
}

const EMPHASIS_TONE = { danger: "text-danger-action", success: "text-success-text" } as const;

type RatingResultPreviewProps = {
  readonly preview: IngredientAnalysisPreviewResponse;
  /** 지금 고른 평가. 고르지 않았으면 null 이다. */
  readonly preference: RatingPreference | null;
  /** 시트를 열 때 저장돼 있던 평가. 고르는 동안 비교 기준은 유지한다. */
  readonly initialPreference?: RatingPreference | null;
  /** 비로그인이면 결과가 늘 넓게 잡은 예상 후보다. */
  readonly guest: boolean;
};

/**
 * 평가 시트 위의 결과 미리보기(#1125, 시안 02). 고른 평가로 저장하면 '나와 안 맞을 수 있는 성분'이 어떻게 되는지 보여 준다.
 * 결과는 근거별 묶음으로 나눈다(#1121). 평가를 바꾸면 앞 결과와 비교해 새 성분은 묶음 순서대로 하나씩 채워지며
 * 묶음 개수가 올라가고, 빠지는 성분은 작아지며 사라지고, 개수가 바뀐 성분은 살짝 커진다.
 * 움직임 줄이기에서는 움직임 없이 바뀐 결과만 보인다.
 */
export function RatingResultPreview({
  preview,
  preference,
  guest,
  initialPreference = null,
}: RatingResultPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const result = previewResultOf(preview, preference, guest);
  const current = previewResultOf(preview, initialPreference, guest).analysis;
  const atBaseline = preference === initialPreference;
  const currentIds = new Set(current.items.map((item) => item.id));
  const choice = preference ?? "NONE";
  const [shown, setShown] = useState<Shown>(() => {
    const restored = displayGroupsOf(previewGroupsOf(current));
    return {
      key: `${choice}:0`,
      choice,
      source: preview,
      revision: 0,
      groups: atBaseline ? restored : transitionGroups(restored, previewGroupsOf(result.analysis)),
      suited: preference === "GOOD",
    };
  });
  if (shown.choice !== choice || shown.source !== preview) {
    // 평가를 먼저 고른 뒤 응답이 오더라도 기준 결과에서 이번 결과로 움직인다.
    const restored = displayGroupsOf(previewGroupsOf(current));
    const revision = shown.revision + 1;
    setShown({
      key: `${choice}:${revision}`,
      choice,
      source: preview,
      revision,
      groups: atBaseline ? restored : transitionGroups(restored, previewGroupsOf(result.analysis)),
      suited: preference === "GOOD",
    });
  }

  useMovedPositions(containerRef, shown.groups);
  useBumpedChips(containerRef, shown);

  useEffect(() => {
    if (!hasLeavingChip(shown.groups)) return;
    const timer = window.setTimeout(
      () => setShown((current) => ({ ...current, groups: settleGroups(current.groups) })),
      motionDelay(settleDelayOf(shown.groups, shown.suited)),
    );
    return () => window.clearTimeout(timer);
  }, [shown.key, shown.groups, shown.suited]);

  const found = shown.groups.some((group) => group.chips.some((chip) => chip.phase !== "leave"));
  const unchanged = !atBaseline && preference === "BAD" && hasSamePreviewCandidates(current, result.analysis);
  const keepsSuited =
    !atBaseline &&
    preference === "GOOD" &&
    removesNothingWhenSuited(preview, current) &&
    preview.productCautionIngredients.length > 0;
  let estimateNote =
    "지금은 모든 타입의 주의 성분을 보여드려요. 피부 타입을 선택하면 내 피부에 해당하는 주의 성분만 볼 수 있어요.";
  if (guest) {
    estimateNote =
      "지금은 모든 타입의 주의 성분을 보여드려요. 로그인 후 피부 타입을 선택하면 내 피부에 해당하는 주의 성분만 볼 수 있어요.";
  }
  const caption: ReturnType<typeof previewCaptionParts> = keepsSuited
    ? { before: "잘 맞았던 제품에 든 성분이에요", after: "" }
    : unchanged
      ? { before: "변경된 게 없어요", after: "" }
      : previewCaptionParts(atBaseline ? null : preference, result);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <section className="flex min-h-0 flex-col gap-2 rounded-2xl bg-background p-3.5">
        <PersonalTag />
        <div className="flex flex-col gap-1">
          <h2 className="text-body leading-snug font-bold text-text-primary">
            {keepsSuited ? "잘 맞은 제품의 성분" : "나와 안 맞을 수 있는 성분"}
          </h2>
          {!unchanged && (
            <p className="text-caption leading-snug text-text-secondary">
              {caption.before}
              {caption.emphasis && caption.tone && (
                <b className={cn("font-semibold", EMPHASIS_TONE[caption.tone])}>{caption.emphasis}</b>
              )}
              {caption.after}
            </p>
          )}
        </div>
        <div ref={containerRef} className="relative flex min-h-0 flex-col gap-2.5 overflow-hidden">
          {preference === "GOOD" ? (
            <PreviewChipList
              chips={uniqueChipsOf(shown.groups)}
              shownKey={shown.key}
              suited
              currentIds={currentIds}
              moreKey="suited"
            />
          ) : (
            shown.groups.map((group) => (
              <PreviewGroupBlock
                key={group.code}
                group={group}
                shownKey={shown.key}
                suited={shown.suited}
                currentIds={currentIds}
              />
            ))
          )}
        </div>
        {unchanged && <p className="text-caption leading-snug text-text-secondary">변경된 게 없어요</p>}
        {!found && !keepsSuited && !unchanged && result.analysis.badProductCount > 0 && (
          <p className="text-caption leading-normal text-text-body">{ANALYSIS_EMPTY_DESCRIPTION}</p>
        )}
        {keepsSuited && <SuitedIngredients ingredients={preview.productCautionIngredients} />}
        {preference === "BAD" && !atBaseline && !unchanged && result.estimated && (
          <p className="text-label leading-snug text-text-secondary">{estimateNote}</p>
        )}
      </section>
    </div>
  );
}
