"use client";

import type { IngredientAnalysisItemResponse, IngredientAnalysisResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
// 패키지 Icon 에 아직 없는 그림(flask-solid)만 옛 아이콘으로 그린다.
import { Icon as LegacyIcon } from "@/components/ui/icons/Icon";
import {
  ANALYSIS_ACCURACY_NOTE,
  ANALYSIS_EMPTY_DESCRIPTION,
  isMarkedNew,
  marksNewIngredients,
  summarizeAnalysis,
} from "@/lib/domain/shelf";

type IngredientChipProps = {
  readonly item: IngredientAnalysisItemResponse;
  /** 신규 성분 표시를 할지(marksNewIngredients) */
  readonly markNew: boolean;
};

/**
 * 성분 칩. 아직 제외하지 않은 성분은 흰 면에 테두리, 검색에서 제외 중인 성분은 회색 면이다.
 * 신규 성분은 오른쪽 위에 점을 찍는다(S53i). 누르면 그 성분의 설명으로 간다.
 */
function IngredientChip({ item, markNew }: IngredientChipProps) {
  const isNew = isMarkedNew(item, markNew);
  const { pressableProps } = usePressable();

  return (
    <li>
      <Link
        href={`/ingredients/${item.id}`}
        entryPoint="shelf"
        {...pressableProps}
        aria-label={`${item.koreanName} 성분 설명 보기${isNew ? ", 신규 성분" : ""}`}
        className={cn(
          "pressable press-scale flex h-8 items-center rounded-full px-3.5 text-body-sm leading-snug font-medium",
          // 회색 칩은 한 단계 진한 면이 정해져 있지 않아 옅게 해서 누른 것을 알린다.
          item.inFilter
            ? "fb-dim bg-border text-text-secondary"
            : "fb-surface border border-border-strong bg-background text-text-primary",
        )}
      >
        {item.koreanName}
        {isNew ? (
          <span
            aria-hidden="true"
            className="absolute top-0 right-1 size-2 rounded-full bg-brand-strong ring-2 ring-background"
          />
        ) : null}
      </Link>
    </li>
  );
}

type ChipGroupProps = {
  readonly title: string;
  readonly items: readonly IngredientAnalysisItemResponse[];
  readonly markNew: boolean;
  readonly children?: React.ReactNode;
};

/** 칩 묶음. 이름 아래에 칩을 줄바꿈하며 늘어놓는다. */
function ChipGroup({ title, items, markNew, children }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-caption leading-snug font-semibold text-text-secondary">{title}</h3>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <IngredientChip key={item.id} item={item} markNew={markNew} />
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}

type ManageLinkProps = {
  readonly href: "/my-page/filter";
  readonly children: string;
  readonly label: string;
};

/** 카드 머리의 '필터 관리 ›'(BTN · Ghost). 높이 32, 누르는 영역은 위아래로 넓혀 44 다. */
function ManageLink({ href, children, label }: ManageLinkProps) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      aria-label={label}
      {...pressableProps}
      className="pressable fb-surface flex h-8 shrink-0 items-center gap-0.5 rounded-xl px-2 text-body-sm leading-snug font-medium text-text-secondary after:absolute after:-inset-y-1.5 after:inset-x-0"
    >
      {children}
      <Icon name="chevron-right" size={14} scalable />
    </Link>
  );
}

type NoteRowProps = {
  readonly icon: "user" | "filter" | "info-circle";
  readonly children: React.ReactNode;
};

/** 아이콘과 13 글자의 안내 줄. 아이콘 칸을 첫 줄 높이(18)에 맞춰 가운데 둔다. */
function NoteRow({ icon, children }: NoteRowProps) {
  return (
    <div className="flex gap-1 text-body-sm leading-snug text-text-secondary">
      <span className="flex h-4.5 shrink-0 items-center">
        <Icon name={icon} size={14} scalable />
      </span>
      {children}
    </div>
  );
}

/** 피부 타입 안내 줄의 '입력하기 ›'. 글자 줄 안에 놓여 상자를 키우지 않고, 누르는 영역만 사방으로 넓힌다. */
function SkinTypeLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/my-page/skin-type"
      aria-label="피부 타입 입력하기"
      {...pressableProps}
      className="pressable flex shrink-0 items-center gap-0.5 font-semibold text-brand-text after:absolute after:-inset-x-2 after:-inset-y-3"
    >
      입력하기
      <Icon name="chevron-right" size={14} scalable />
    </Link>
  );
}

type IngredientAnalysisCardProps = {
  readonly analysis: IngredientAnalysisResponse;
  /** 나만의 필터에 든 성분 수 */
  readonly filterCount: number;
  /** 피부 타입을 알려 주지 않았으면 더 찾을 수 있다고 안내한다(S53b). */
  readonly askSkinType: boolean;
};

/**
 * 안 맞을 수 있는 성분 카드(APP · 안 맞을 수 있는 성분 카드 · 상태별 묶음, S52 · S53).
 * 머리(제목 · 필터 관리 ›) → 아직 제외하지 않은 성분 → 검색에서 제외 중 → 고르기 버튼(고를 성분이 있을 때만)
 * → 아래 안내(피부 타입 · 정확도) 순서다. 찾은 성분이 없으면 머리 아래에 설명만 두고 정확도 안내로 끝낸다(S53m).
 */
export function IngredientAnalysisCard({ analysis, filterCount, askSkinType }: IngredientAnalysisCardProps) {
  const router = useRouter();
  const summary = summarizeAnalysis(analysis.items, filterCount, analysis.badProductCount);
  const markNew = marksNewIngredients(filterCount);
  const found = analysis.items.length > 0;
  const notExcluded = analysis.items.filter((item) => !item.inFilter);
  const excluded = analysis.items.filter((item) => item.inFilter);

  return (
    <section aria-labelledby="ingredient-analysis-title" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex min-h-8 items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning-soft"
        >
          <LegacyIcon name="flask-solid" size={14} className="text-warning-text" />
        </span>
        <h2
          id="ingredient-analysis-title"
          className="min-w-0 flex-1 text-title leading-snug font-bold text-text-primary"
        >
          안 맞을 수 있는 성분
        </h2>
        <ManageLink href="/my-page/filter" label="나만의 필터 관리">
          필터 관리
        </ManageLink>
      </div>

      {found ? null : <p className="text-body-sm leading-normal text-text-body">{ANALYSIS_EMPTY_DESCRIPTION}</p>}

      {notExcluded.length > 0 ? (
        <ChipGroup title={`아직 제외하지 않은 성분 ${notExcluded.length}`} items={notExcluded} markNew={markNew} />
      ) : null}

      {found && filterCount > 0 ? (
        <ChipGroup title={`검색에서 제외 중 ${filterCount}`} items={excluded} markNew={markNew}>
          {summary.outsideResultCount > 0 ? (
            <NoteRow icon="filter">
              <p>{`${summary.outsideResultCount}개는 더 이상 의심되지 않아요`}</p>
            </NoteRow>
          ) : null}
        </ChipGroup>
      ) : null}

      {found && summary.pickLabel ? (
        <Button size="sm" className="w-full" onClick={() => router.push("/shelf/filter")}>
          {summary.pickLabel}
        </Button>
      ) : null}

      <div className="flex flex-col gap-2">
        {found && askSkinType ? (
          // 글자를 크게 키워 자리가 모자라면 낱말을 쪼개지 않고 [입력하기]를 다음 줄로 넘긴다.
          <NoteRow icon="user">
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="min-w-40 flex-1">피부 타입을 입력하면 더 찾을 수 있어요</p>
              <SkinTypeLink />
            </div>
          </NoteRow>
        ) : null}
        <NoteRow icon="info-circle">
          <p className="leading-normal">{ANALYSIS_ACCURACY_NOTE}</p>
        </NoteRow>
      </div>
    </section>
  );
}
