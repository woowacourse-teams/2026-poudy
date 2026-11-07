"use client";

import type { IngredientAnalysisItemResponse, IngredientAnalysisResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { shelfAnalysisRevision } from "@/lib/analytics/shelf";
import {
  ANALYSIS_ACCURACY_NOTE,
  ANALYSIS_EMPTY_DESCRIPTION,
  analysisGroups,
  isMarkedNew,
  marksNewIngredients,
  summarizeAnalysis,
} from "@/lib/domain/shelf";
import { useEventExposure } from "@/lib/hooks/useEventExposure";

type IngredientChipProps = {
  readonly item: IngredientAnalysisItemResponse;
  /** 신규 성분 표시를 할지(marksNewIngredients) */
  readonly markNew: boolean;
};

/**
 * 성분 칩. 아직 제외하지 않은 성분은 흰 면에 테두리, 검색에서 제외 중인 성분은 회색 면이다.
 * 신규 성분은 오른쪽 위에 점을 찍는다(S53i). 누르면 그 성분의 설명으로 간다.
 * 이름은 줄을 바꾸지 않는다. 칩의 최대 폭은 칩 묶음 폭이고, 한 칩이 행보다 넓으면 말줄임으로 자른다.
 * 잘려도 칩의 접근성 이름은 전체 이름이고, 성분 설명에도 전체 이름이 있다.
 */
function IngredientChip({ item, markNew }: IngredientChipProps) {
  const isNew = isMarkedNew(item, markNew);
  const { pressableProps } = usePressable();

  return (
    <li className="max-w-full">
      <Link
        href={`/ingredients/${item.id}`}
        entryPoint="shelf"
        {...pressableProps}
        aria-label={`${item.koreanName} 성분 설명 보기${isNew ? ", 신규 성분" : ""}`}
        className={cn(
          "pressable press-scale flex h-8 max-w-full items-center rounded-full px-3.5 text-body-sm leading-snug font-medium",
          // 회색 칩은 한 단계 진한 면이 정해져 있지 않아 옅게 해서 누른 것을 알린다.
          // 흰 칩은 회색 카드(ui-surface) 위라, ui-hover 로 칠하면 카드 바탕과 같은 색이 되어 칩이 사라져 보인다. 한 단계 진한 면을 쓴다.
          item.inFilter
            ? "fb-dim bg-border text-text-secondary"
            : "fb-border border border-border-strong bg-background text-text-primary",
        )}
      >
        <span className="truncate">{item.koreanName}</span>
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
  readonly nested?: boolean;
};

/** 칩 묶음. 이름 아래에 칩을 줄바꿈하며 늘어놓는다. */
function ChipGroup({ title, items, markNew, children, nested = false }: ChipGroupProps) {
  const Heading = nested ? "h4" : "h3";
  return (
    <div className="flex flex-col gap-2">
      <Heading className="text-caption leading-snug font-semibold text-text-secondary">{title}</Heading>
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

/**
 * 카드 머리의 '필터 관리 ›'(BTN · Ghost). 높이 32, 누르는 영역은 위아래로 넓혀 44 다.
 * 카드가 회색 면(ui-surface)이라 hover·눌림은 한 단계 진한 면(fb-border)이다. fb-surface 면 카드와 같은 색이라 보이지 않는다.
 */
function ManageLink({ href, children, label }: ManageLinkProps) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      aria-label={label}
      {...pressableProps}
      className="pressable press-scale fb-border flex h-8 shrink-0 items-center gap-0.5 rounded-xl px-2 text-body-sm leading-snug font-medium text-text-secondary after:absolute after:-inset-y-1.5 after:inset-x-0"
    >
      {children}
      <Icon name="chevron-right" size={14} scalable />
    </Link>
  );
}

type NoteRowProps = {
  readonly icon: "user" | "filter" | "info-circle";
  /** 문구의 줄 높이. 여러 줄로 읽히는 문단은 normal 이다. 기본 snug. */
  readonly leading?: "snug" | "normal";
  readonly children: React.ReactNode;
};

const NOTE_LEADING = { snug: "leading-snug", normal: "leading-normal" } as const;

/**
 * 아이콘과 13 글자의 안내 줄. 아이콘 칸 높이를 문구 첫 줄 높이(1lh)로 두어 아이콘이 첫 줄 가운데에 온다.
 * 글자를 키워도 칸이 첫 줄과 함께 커진다. 줄 높이는 행에 주어 칸과 문구가 같은 값을 쓴다.
 */
function NoteRow({ icon, leading = "snug", children }: NoteRowProps) {
  return (
    <div className={cn("flex gap-1 text-body-sm text-text-secondary", NOTE_LEADING[leading])}>
      <span className="flex h-lh shrink-0 items-center">
        <Icon name={icon} size={14} scalable />
      </span>
      {children}
    </div>
  );
}

/** 피부 타입 안내 줄의 '입력하기 ›'. 글자 줄 안에 놓여 상자를 키우지 않고, 누르는 영역과 hover 면(fb-inline)만 둘레로 넓힌다. */
function SkinTypeLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/my-page/skin-type"
      aria-label="피부 타입 입력하기"
      {...pressableProps}
      className="pressable press-scale fb-inline flex shrink-0 items-center gap-0.5 font-semibold text-brand-text after:absolute after:-inset-x-2 after:-inset-y-3"
    >
      입력하기
      <Icon name="chevron-right" size={14} scalable />
    </Link>
  );
}

/** 비로그인은 검색 제외가 없어 '제외하지 않은'이라는 말이 맞지 않는다. */
const candidateHeading = (canManageFilter: boolean, count: number): string => {
  if (canManageFilter) return `아직 제외하지 않은 성분 ${count}`;
  return `찾은 성분 ${count}`;
};

type IngredientAnalysisCardProps = {
  readonly analysis: IngredientAnalysisResponse;
  /** 나만의 필터에 든 성분 수 */
  readonly filterCount: number;
  /** 피부 타입을 알려 주지 않았으면 더 찾을 수 있다고 안내한다(S53b). */
  readonly askSkinType: boolean;
  /** 결과를 읽기만 하는 화면에서는 회원용 필터 동작을 숨긴다. */
  readonly canManageFilter?: boolean;
  readonly visible?: boolean;
};

/**
 * 안 맞을 수 있는 성분 카드(APP · 안 맞을 수 있는 성분 카드 · 상태별 묶음, S52 · S53).
 * 머리(제목 · 필터 관리 ›) → 아직 제외하지 않은 성분 → 검색에서 제외 중 → 고르기 버튼(고를 성분이 있을 때만)
 * → 아래 안내(피부 타입 · 정확도) 순서다. 찾은 성분이 없으면 머리 아래에 설명만 두고 정확도 안내로 끝낸다(S53m).
 */
export function IngredientAnalysisCard({
  analysis,
  filterCount,
  askSkinType,
  canManageFilter = true,
  visible = true,
}: IngredientAnalysisCardProps) {
  const router = useRouter();
  const summary = summarizeAnalysis(analysis.items, {
    filterCount,
    badProductCount: analysis.badProductCount,
    hasSkinType: !askSkinType,
  });
  const markNew = marksNewIngredients(filterCount);
  const revision = shelfAnalysisRevision(analysis);
  const titleRef = useEventExposure(
    "shelf_analysis_viewed",
    {
      bad_product_count: analysis.badProductCount,
      candidate_count: analysis.items.length,
      new_candidate_count: summary.newCount,
      selectable_count: analysis.items.filter((item) => !item.inFilter).length,
      cta_available: canManageFilter && Boolean(summary.pickLabel) && analysis.items.length > 0,
      analysis_revision: revision,
    },
    { enabled: visible, viewKey: revision },
  );
  const found = analysis.items.length > 0;
  const notExcluded = analysis.items.filter((item) => !item.inFilter);
  const excluded = analysis.items.filter((item) => item.inFilter);

  return (
    <section aria-labelledby="ingredient-analysis-title" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex gap-2 text-title leading-snug">
        {/* 아이콘은 제목 첫 줄 가운데에 둔다. 글자를 키우면 칸이 첫 줄과 함께 커진다. */}
        <span className="flex h-lh min-h-8 shrink-0 items-center">
          <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-warning-soft">
            <Icon name="flask-conical" filled size={14} className="text-warning-text" />
          </span>
        </span>
        {/* 글자를 키워 제목과 한 줄에 들지 않으면 낱말을 쪼개지 않고 '필터 관리'를 제목 아래로 넘긴다. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h2
            ref={titleRef}
            id="ingredient-analysis-title"
            className="flex min-h-8 min-w-0 grow items-center font-bold text-text-primary"
          >
            안 맞을 수 있는 성분
          </h2>
          {canManageFilter ? (
            <ManageLink href="/my-page/filter" label="나만의 필터 관리">
              필터 관리
            </ManageLink>
          ) : null}
        </div>
      </div>

      {found ? null : <p className="text-body-sm leading-normal text-text-body">{ANALYSIS_EMPTY_DESCRIPTION}</p>}

      {notExcluded.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-caption leading-snug font-semibold text-text-secondary">
            {candidateHeading(canManageFilter, notExcluded.length)}
          </h3>
          {analysisGroups(notExcluded).map(({ reason, items }) => (
            <ChipGroup
              key={reason.code}
              title={`${reason.name} ${items.length}`}
              items={items}
              markNew={markNew}
              nested
            />
          ))}
        </div>
      ) : null}

      {found && canManageFilter && filterCount > 0 ? (
        <ChipGroup title={`검색에서 제외 중 ${filterCount}`} items={excluded} markNew={markNew}>
          {summary.outsideResultCount > 0 ? (
            <NoteRow icon="filter">
              <p>{`${summary.outsideResultCount}개는 더 이상 의심되지 않아요`}</p>
            </NoteRow>
          ) : null}
        </ChipGroup>
      ) : null}

      {found && canManageFilter && summary.pickLabel ? (
        <Button size="sm" className="w-full" onClick={() => router.push("/pouch/filter")}>
          {summary.pickLabel}
        </Button>
      ) : null}

      <div className="flex flex-col gap-2">
        {found && canManageFilter && askSkinType ? (
          // 글자를 크게 키워 자리가 모자라면 낱말을 쪼개지 않고 [입력하기]를 다음 줄로 넘긴다.
          <NoteRow icon="user">
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="min-w-40 flex-1">피부 타입을 입력하면 더 찾을 수 있어요</p>
              <SkinTypeLink />
            </div>
          </NoteRow>
        ) : null}
        {found && !canManageFilter ? (
          <NoteRow icon="info-circle" leading="normal">
            <p>해당 피부 조건일 때 주의할 수 있는 예상 후보예요.</p>
          </NoteRow>
        ) : null}
        <NoteRow icon="info-circle" leading="normal">
          <p>{ANALYSIS_ACCURACY_NOTE}</p>
        </NoteRow>
      </div>
    </section>
  );
}
