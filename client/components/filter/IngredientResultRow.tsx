"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { IngredientRow, type IngredientRowProps } from "@/components/ingredient/IngredientRow";
import { withJosa } from "@/lib/domain/format";

/**
 * 행의 상태(명세 APP · 성분 검색 결과 행 · 추가됨 · 이미 추가됨).
 * - idle: 추가하기 전. 흰 원 + 테두리 안의 +
 * - added: 지금 고르는 쪽에 추가됨. 칠한 원 안의 ✓. 다시 누르면 빠진다
 * - covered: 성분군으로 이미 추가된 성분. 흐린 이름 + 회색 ✓, 누를 수 없다
 *
 * 반대쪽에 추가된 것도 막지 않는다. 누르면 옮겨 오고 안내 줄로 알린다(S33a).
 */
export type ResultRowState = "idle" | "added" | "covered";

type IngredientResultRowProps = Omit<IngredientRowProps, "muted" | "action"> & {
  readonly state: ResultRowState;
  /** 추가됨 원의 색과 버튼 이름의 대상. 피하고 싶은 성분을 고를 때는 브랜드 색이다. */
  readonly tone: "include" | "exclude";
  /** covered 일 때 이 성분을 덮은 성분군 이름. 버튼 이름에 함께 읽는다(A11Y D05). */
  readonly coveredBy?: string;
  readonly onToggle: () => void;
};

/** 버튼 이름의 대상(A11Y D05). 어느 쪽에 넣는지 이름만 듣고도 알 수 있게 한다. */
const TARGET = { include: "원하는 성분", exclude: "피하고 싶은 성분" } as const;

/**
 * 성분·성분군 검색 결과 행(명세 APP · 성분 검색 결과 행, APP · 성분군 검색 결과 행). 행 본문은 누르는 동작이 없고,
 * 오른쪽 끝 44×44 의 추가 버튼만 누른다(A11Y D12). 탐색 조건(#735)의 성분 검색에서도 같은 행을 쓴다.
 * 행 모양은 나만의 필터와 같은 성분 행(IngredientRow)이고, 이 행은 추가 버튼만 정한다.
 */
export function IngredientResultRow({ state, tone, coveredBy, onToggle, ...row }: IngredientResultRowProps) {
  return (
    <IngredientRow
      {...row}
      muted={state === "covered"}
      action={<AddButton name={row.name} state={state} tone={tone} coveredBy={coveredBy} onToggle={onToggle} />}
    />
  );
}

function AddButton({
  name,
  state,
  tone,
  coveredBy,
  onToggle,
}: {
  readonly name: string;
  readonly state: ResultRowState;
  readonly tone: "include" | "exclude";
  readonly coveredBy?: string;
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
        <span className="sr-only">{`${name}, ${coveredBy ? withJosa(coveredBy, "으로/로") : "성분군으로"} 추가됨`}</span>
      </span>
    );
  }

  const added = state === "added";
  return (
    <button
      type="button"
      aria-pressed={added}
      aria-label={`${TARGET[tone]}에 ${name} 추가`}
      {...pressableProps}
      onClick={onToggle}
      // 추가하기 전은 투명 아이콘 버튼처럼 원(36)에 ui-hover 면을 깔고(fb-circle), 추가한 뒤는 칠한 원을 옅게 한다(fb-dim).
      className={
        added
          ? "pressable fb-dim flex size-11 shrink-0 items-center justify-center"
          : "pressable fb-circle flex size-11 shrink-0 items-center justify-center"
      }
    >
      {added ? (
        <span
          data-focus-ring=""
          className={
            tone === "exclude"
              ? "flex size-9 items-center justify-center rounded-full bg-brand-text text-action-text"
              : "flex size-9 items-center justify-center rounded-full bg-action text-action-text"
          }
        >
          <Icon name="check" size={20} />
        </span>
      ) : (
        <span
          data-focus-ring=""
          className="relative flex size-9 items-center justify-center rounded-full border border-border-strong text-text-primary"
        >
          <Icon name="plus" size={20} />
        </span>
      )}
    </button>
  );
}
