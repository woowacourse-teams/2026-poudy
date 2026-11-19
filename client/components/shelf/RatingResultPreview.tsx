"use client";

import type { IngredientAnalysisPreviewResponse, RatingPreference } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { motionDelay, prefersReducedMotion, useMovedPositions } from "./preview-motion";
import { SuitedIngredients } from "./SuitedIngredients";

import { ProductImage } from "@/components/ui/ProductImage";
import {
  type DisplayChip,
  displayChipsOf,
  enteringChipCount,
  hasLeavingChip,
  hasSamePreviewCandidates,
  previewCaptionParts,
  previewChipsOf,
  previewResultOf,
  productIngredientIdsOf,
  removesNothingWhenSuited,
  settleChips,
  transitionChips,
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
/** 시트 위 자리가 좁아 이만큼만 칩으로 보이고 나머지는 개수로 줄인다. */
const CHIPS_SHOWN = 8;

type Shown = {
  readonly key: string;
  readonly choice: string;
  readonly source: IngredientAnalysisPreviewResponse;
  readonly revision: number;
  readonly chips: readonly DisplayChip[];
  readonly suited: boolean;
};

/** 움직임이 다 끝나는 시각. 그 뒤에 빠진 칩을 지운다. */
const settleDelayOf = (chips: readonly DisplayChip[], suited: boolean): number => {
  const enterEnd = ENTER_START_MS + Math.max(enteringChipCount(chips) - 1, 0) * ENTER_STAGGER_MS + ENTER_MS;
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
 * 칩 색(시안 07). 이 제품에 든 성분은 분홍 면, 다른 제품에서만 온 성분은 회색 면이다.
 * 안 맞았어요로 더해지는 성분은 빨간 면과 테두리, 잘 맞았어요로 빠지는 성분은 초록 면에 취소선이다.
 */
type ChipTone = { readonly suited: boolean; readonly added: boolean; readonly inProduct: boolean };

const toneOf = (chip: DisplayChip, { suited, added, inProduct }: ChipTone): string => {
  if (chip.phase === "leave" && suited && !added) {
    return "border-success-border bg-success-soft text-success-text line-through";
  }
  if (added) return "border-danger-action bg-danger-soft text-danger-action";
  if (!inProduct) return "border-transparent bg-surface text-text-secondary";
  return "border-transparent bg-brand-soft text-brand-text";
};

/**
 * 칩 안 개수 글자의 색. 칩 이름과 구별되게 칩 글자색 옆의 불투명 역할 토큰을 쓴다.
 * 투명도로 옅게 만든 글자색은 쓰지 않는다(Hallmark). 고른 토큰은 칩 글자색을 75%로 옅게 한 색에 가장 가깝다.
 */
const countToneOf = (chip: DisplayChip, { suited, added, inProduct }: ChipTone): string => {
  if (chip.phase === "leave" && suited && !added) return "text-success";
  if (added) return "text-danger-action-pressed";
  if (!inProduct) return "text-text-muted";
  return "text-brand-strong";
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
  /** 이 제품 사진. 이 제품에 든 성분일 때만 칩 앞에 붙인다. */
  readonly productImageUrl: string | undefined;
};

function PreviewChipItem({ chip, shownKey, suited, added, productImageUrl }: PreviewChipItemProps) {
  const count = useShownCount(chip, shownKey);
  const tone: ChipTone = { suited, added, inProduct: productImageUrl !== undefined };
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
        productImageUrl !== undefined && "pl-1",
        toneOf(chip, tone),
      )}
    >
      {productImageUrl !== undefined && (
        <ProductImage
          src={productImageUrl}
          size={16}
          sizes="16px"
          className="size-4 shrink-0 rounded-full bg-background object-cover"
        />
      )}
      {chip.name}
      <span className={cn("text-label", countToneOf(chip, tone))}>{`${count}개`}</span>
    </li>
  );
}

/** 보일 칩. 빠지는 칩은 빠지는 모습이 보이도록 늘 남긴다. */
const chipsShownIn = (chips: readonly DisplayChip[]): readonly DisplayChip[] =>
  chips.reduce<{ readonly shown: readonly DisplayChip[]; readonly kept: number }>(
    ({ shown, kept }, chip) => {
      if (chip.phase === "leave") return { shown: [...shown, chip], kept };
      if (kept >= CHIPS_SHOWN) return { shown, kept: kept + 1 };
      return { shown: [...shown, chip], kept: kept + 1 };
    },
    { shown: [], kept: 0 },
  ).shown;

type PreviewChipListProps = {
  readonly chips: readonly DisplayChip[];
  readonly shownKey: string;
  readonly suited: boolean;
  readonly currentIds: ReadonlySet<number>;
  readonly productIds: ReadonlySet<number>;
  readonly productImageUrl: string;
  readonly moreKey: string;
};

const imageOf = (inProduct: boolean, imageUrl: string): string | undefined => {
  if (inProduct) return imageUrl;
  return undefined;
};

function PreviewChipList({
  chips,
  shownKey,
  suited,
  currentIds,
  productIds,
  productImageUrl,
  moreKey,
}: PreviewChipListProps) {
  const hidden = Math.max(chips.filter((chip) => chip.phase !== "leave").length - CHIPS_SHOWN, 0);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chipsShownIn(chips).map((chip) => (
        <PreviewChipItem
          key={chip.key}
          chip={chip}
          shownKey={shownKey}
          suited={suited}
          added={!currentIds.has(chip.id)}
          productImageUrl={imageOf(!currentIds.has(chip.id) || productIds.has(chip.id), productImageUrl)}
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

const EMPHASIS_TONE = { danger: "text-danger-action", success: "text-success-text" } as const;

type RatingResultPreviewProps = {
  readonly preview: IngredientAnalysisPreviewResponse;
  /** 지금 고른 평가. 고르지 않았으면 null 이다. */
  readonly preference: RatingPreference | null;
  /** 시트를 열 때 저장돼 있던 평가. 고르는 동안 비교 기준은 유지한다. */
  readonly initialPreference?: RatingPreference | null;
  /** 평가하는 제품. 이 제품에 든 성분 칩에 사진을 붙인다. */
  readonly product: { readonly id: number; readonly imageUrl: string };
};

/**
 * 평가 시트 위의 결과 미리보기(#1125, 시안 02). 고른 평가로 저장하면 '내 평가로 찾은 의심 성분'이 어떻게 되는지 보여 준다.
 * 평가를 바꾸면 앞 결과와 비교해 새 성분은 하나씩 나타나고, 빠지는 성분은 작아지며 사라지고, 개수가 바뀐 성분은 살짝 커진다.
 * 움직임 줄이기에서는 움직임 없이 바뀐 결과만 보인다.
 */
export function RatingResultPreview({
  preview,
  preference,
  initialPreference = null,
  product,
}: RatingResultPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const result = previewResultOf(preview, preference);
  const current = previewResultOf(preview, initialPreference).analysis;
  const atBaseline = preference === initialPreference;
  const currentIds = new Set(current.items.map((item) => item.id));
  const choice = preference ?? "NONE";
  const [shown, setShown] = useState<Shown>(() => {
    const restored = displayChipsOf(previewChipsOf(current));
    return {
      key: `${choice}:0`,
      choice,
      source: preview,
      revision: 0,
      chips: atBaseline ? restored : transitionChips(restored, previewChipsOf(result.analysis)),
      suited: preference === "GOOD",
    };
  });
  if (shown.choice !== choice || shown.source !== preview) {
    // 평가를 먼저 고른 뒤 응답이 오더라도 기준 결과에서 이번 결과로 움직인다.
    const restored = displayChipsOf(previewChipsOf(current));
    const revision = shown.revision + 1;
    setShown({
      key: `${choice}:${revision}`,
      choice,
      source: preview,
      revision,
      chips: atBaseline ? restored : transitionChips(restored, previewChipsOf(result.analysis)),
      suited: preference === "GOOD",
    });
  }

  useMovedPositions(containerRef, shown.chips);
  useBumpedChips(containerRef, shown);

  useEffect(() => {
    if (!hasLeavingChip(shown.chips)) return;
    const timer = window.setTimeout(
      () => setShown((current) => ({ ...current, chips: settleChips(current.chips) })),
      motionDelay(settleDelayOf(shown.chips, shown.suited)),
    );
    return () => window.clearTimeout(timer);
  }, [shown.key, shown.chips, shown.suited]);

  const found = shown.chips.some((chip) => chip.phase !== "leave");
  const unchanged = !atBaseline && preference === "BAD" && hasSamePreviewCandidates(current, result.analysis);
  const keepsSuited =
    !atBaseline &&
    preference === "GOOD" &&
    removesNothingWhenSuited(preview, current) &&
    preview.productCautionIngredients.length > 0;
  const caption: ReturnType<typeof previewCaptionParts> = keepsSuited
    ? { before: "잘 맞았던 제품에 든 성분이에요", after: "" }
    : unchanged
      ? { before: "변경된 게 없어요", after: "" }
      : previewCaptionParts(atBaseline ? null : preference, result);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <section className="flex min-h-0 flex-col gap-2 rounded-2xl bg-background p-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="text-body leading-snug font-bold text-text-primary">
            {keepsSuited ? "잘 맞은 제품의 성분" : "내 평가로 찾은 의심 성분"}
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
          <PreviewChipList
            chips={shown.chips}
            shownKey={shown.key}
            suited={shown.suited}
            currentIds={currentIds}
            productIds={productIngredientIdsOf(preview, product.id)}
            productImageUrl={product.imageUrl}
            moreKey="result"
          />
        </div>
        {unchanged && <p className="text-caption leading-snug text-text-secondary">변경된 게 없어요</p>}
        {!found && !keepsSuited && !unchanged && result.analysis.badProductCount > 0 && (
          <p className="text-caption leading-normal text-text-body">{ANALYSIS_EMPTY_DESCRIPTION}</p>
        )}
        {keepsSuited && <SuitedIngredients ingredients={preview.productCautionIngredients} />}
      </section>
    </div>
  );
}
