"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ReactNode } from "react";

/**
 * 행의 상태(명세 APP · 성분 검색 결과 행 · 담김 · 이미 담김).
 * - idle: 담기 전. 흰 원 + 테두리 안의 +
 * - added: 지금 고르는 쪽에 담김. 칠한 원 안의 ✓. 다시 누르면 빠진다
 * - covered: 성분군으로 이미 담긴 성분. 흐린 이름 + 회색 ✓, 누를 수 없다
 * - blocked: 반대쪽에 이미 있어 담을 수 없다. 이유를 글자로 적고 누를 수 없다
 */
export type ResultRowState = "idle" | "added" | "covered" | "blocked";

type IngredientResultRowProps = {
  readonly name: string;
  /** 아래 줄 설명. 성분군 행은 두지 않는다. */
  readonly description?: string;
  /** 이름 옆 배지. 성분군 행의 '성분군'. */
  readonly badge?: string;
  /** 이름 옆 효과 아이콘(최대 3개). */
  readonly icons?: readonly ReactNode[];
  readonly state: ResultRowState;
  /** 담김 원의 색. 피하고 싶은 성분을 고를 때는 브랜드 색이다. */
  readonly tone: "include" | "exclude";
  readonly blockedLabel: string;
  readonly onToggle: () => void;
};

/**
 * 성분·성분군 검색 결과 행(명세 APP · 성분 검색 결과 행, APP · 성분군 검색 결과 행). 행 본문은 누르는 동작이 없고,
 * 오른쪽 끝 44×44 의 담기 버튼만 누른다(A11Y D12). 탐색 조건(#735)의 성분 검색에서도 같은 행을 쓴다.
 */
export function IngredientResultRow({
  name,
  description,
  badge,
  icons = [],
  state,
  tone,
  blockedLabel,
  onToggle,
}: IngredientResultRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={
              state === "covered"
                ? "truncate text-title font-semibold text-text-secondary"
                : "truncate text-title font-semibold text-text-primary"
            }
          >
            {name}
          </span>
          {badge ? (
            <span className="flex h-5 shrink-0 items-center rounded-md bg-layer px-2 text-caption font-semibold text-text-secondary">
              {badge}
            </span>
          ) : null}
          {icons.length > 0 ? (
            <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
              {icons}
            </span>
          ) : null}
        </div>
        {description ? (
          <span
            className={
              state === "covered"
                ? "truncate text-body-sm text-text-muted"
                : "truncate text-body-sm text-text-secondary"
            }
          >
            {description}
          </span>
        ) : null}
      </div>

      {state === "blocked" ? (
        <span className="shrink-0 text-caption font-medium text-text-muted">{blockedLabel}</span>
      ) : (
        <AddButton name={name} state={state} tone={tone} onToggle={onToggle} />
      )}
    </div>
  );
}

function AddButton({
  name,
  state,
  tone,
  onToggle,
}: {
  readonly name: string;
  readonly state: Exclude<ResultRowState, "blocked">;
  readonly tone: "include" | "exclude";
  readonly onToggle: () => void;
}) {
  const covered = state === "covered";
  const { pressableProps } = usePressable({ disabled: covered });

  if (covered) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-layer text-text-muted">
          <Icon name="check" size={20} />
        </span>
        <span className="sr-only">{`${name} 성분군으로 담김`}</span>
      </span>
    );
  }

  const added = state === "added";
  return (
    <button
      type="button"
      aria-pressed={added}
      aria-label={`${name} 담기`}
      {...pressableProps}
      onClick={onToggle}
      className="pressable group flex size-11 shrink-0 items-center justify-center"
    >
      {added ? (
        <span
          data-focus-ring=""
          className={
            tone === "exclude"
              ? "flex size-9 items-center justify-center rounded-full bg-brand-text text-action-text transition-opacity duration-(--duration-fast) group-data-hovered:opacity-(--pressed-opacity) group-data-pressed:opacity-(--pressed-opacity)"
              : "flex size-9 items-center justify-center rounded-full bg-action text-action-text transition-opacity duration-(--duration-fast) group-data-hovered:opacity-(--pressed-opacity) group-data-pressed:opacity-(--pressed-opacity)"
          }
        >
          <Icon name="check" size={20} />
        </span>
      ) : (
        <span
          data-focus-ring=""
          className="flex size-9 items-center justify-center rounded-full border border-border-strong bg-background text-text-primary transition-colors duration-(--duration-fast) group-data-hovered:bg-surface group-data-pressed:bg-surface"
        >
          <Icon name="plus" size={20} />
        </span>
      )}
    </button>
  );
}
