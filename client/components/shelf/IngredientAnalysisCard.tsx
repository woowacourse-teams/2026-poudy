"use client";

import type { IngredientAnalysisItemResponse, IngredientAnalysisResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icons/Icon";
import {
  analysisDescription,
  analysisHint,
  isMarkedNew,
  marksNewIngredients,
  summarizeAnalysis,
} from "@/lib/domain/shelf";

type IngredientChipProps = {
  readonly item: IngredientAnalysisItemResponse;
  /** 새로 나온 표시를 할지(marksNewIngredients) */
  readonly markNew: boolean;
};

/** 성분 칩. 이미 검색에서 제외 중이면 회색 면에 체크를, 새로 나왔으면 앞에 점을 둔다(S53i·S53l). */
function IngredientChip({ item, markNew }: IngredientChipProps) {
  const isNew = isMarkedNew(item, markNew);

  return (
    <li
      className={cn(
        "flex h-8 items-center gap-1 rounded-full px-3 text-body-sm leading-none font-semibold",
        item.inFilter ? "bg-border text-text-secondary" : "border border-border-strong bg-background text-text-primary",
      )}
    >
      {isNew ? <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-strong" /> : null}
      {item.inFilter ? <Icon name="check" size={14} /> : null}
      {item.koreanName}
      {item.inFilter ? <span className="sr-only">, 검색에서 제외 중</span> : null}
      {isNew ? <span className="sr-only">, 새로 나온 성분</span> : null}
    </li>
  );
}

type GuideRowProps = {
  /** 나만의 필터 관리(/my-page/filter, S55j)는 아직 화면이 없다. 링크만 먼저 둔다. */
  readonly href: "/my-page/skin-type" | "/my-page/filter";
  readonly icon: React.ReactNode;
  readonly action: string;
  readonly children: React.ReactNode;
};

/** 카드 안의 안내 줄. 줄 전체가 링크다(피부 타입 알려 주기 · 검색 제외 관리하기). */
function GuideRow({ href, icon, action, children }: GuideRowProps) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      {...pressableProps}
      className="pressable fb-surface flex min-h-11 items-center gap-2 rounded-xl bg-background px-3 py-2"
    >
      <span className="shrink-0 text-text-secondary">{icon}</span>
      <span className="min-w-0 flex-1 text-body-sm whitespace-pre-line text-text-primary">{children}</span>
      <span className="flex shrink-0 items-center text-body-sm font-semibold text-brand-text">
        {action}
        <Icon name="chevron-right" size={16} />
      </span>
    </Link>
  );
}

type IngredientAnalysisCardProps = {
  readonly analysis: IngredientAnalysisResponse;
  /** 나만의 필터에 든 성분 수 */
  readonly filterCount: number;
  /** 피부 타입을 알려 주지 않았으면 더 좁힐 수 있다고 안내한다(S53b). */
  readonly askSkinType: boolean;
};

/**
 * 안 맞을 수 있는 성분 카드(명세 APP · 안 맞을 수 있는 성분 카드 · 펼침).
 * 이미 제외 중인 성분이 있으면 아래에 관리 줄을 두고, 새로 나온 성분이 있을 때만 고르기 버튼을 둔다.
 */
export function IngredientAnalysisCard({ analysis, filterCount, askSkinType }: IngredientAnalysisCardProps) {
  const router = useRouter();
  const summary = summarizeAnalysis(analysis.items, filterCount);

  return (
    <section aria-labelledby="ingredient-analysis-title" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-danger-soft"
        >
          {/* TODO(#729): 주의 성분 아이콘(Tabler flask, 14 · ui-danger-action). Icon 부품이 들어오면 넣는다. */}
        </span>
        <h2 id="ingredient-analysis-title" className="text-title font-bold text-text-primary">
          안 맞을 수 있는 성분
        </h2>
      </div>

      <p className="text-body-sm text-text-body">
        {analysisDescription(analysis.badProductCount)}
        <br />
        피부 반응의 원인으로 확인된 것은 아니에요.
      </p>

      <ul className="flex flex-wrap gap-2">
        {analysis.items.map((item) => (
          <IngredientChip key={item.id} item={item} markNew={marksNewIngredients(filterCount)} />
        ))}
      </ul>

      {askSkinType ? (
        <GuideRow href="/my-page/skin-type" icon={<Icon name="info" size={16} />} action="알려 주기">
          피부 타입을 알려 주면 더 좁혀 드려요
        </GuideRow>
      ) : null}

      <p className="flex items-center gap-1 text-caption text-text-secondary">
        <Icon name="info" size={14} />
        {analysisHint(analysis.badProductCount)}
      </p>

      {summary.pickLabel ? (
        <Button className="w-full" onClick={() => router.push("/shelf/filter")}>
          {summary.pickLabel}
        </Button>
      ) : null}

      {summary.showManage ? (
        <GuideRow
          href="/my-page/filter"
          // TODO(#729): 필터 아이콘(Tabler filter, 16). Icon 부품이 들어오면 넣는다.
          icon={null}
          action="관리하기"
        >
          {`검색에서 제외 중인 성분 ${filterCount}개`}
          {summary.outsideResultCount > 0 ? `\n${summary.outsideResultCount}개는 지금 결과에 없어요` : null}
        </GuideRow>
      ) : null}
    </section>
  );
}
