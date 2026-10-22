"use client";

import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { FieldFrame } from "./field-frame";
import type { GroupLabelProps } from "./accessible-name";
import { hasVisibleLabel } from "./accessible-name";
import { Icon } from "./icon";
import { usePressable } from "./use-pressable";

type Variant = "list" | "choice" | "card" | "card-row";

type RadioGroupContextValue = {
  readonly name: string;
  readonly value: string | undefined;
  readonly onValueChange: (value: string) => void;
  readonly variant: Variant;
  readonly size: "md" | "sm";
  readonly disabled: boolean;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

const COLUMNS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;

/*
 * 선택 카드는 묶음 폭이 이 값(글자 크기 기준 em)보다 좁으면 한 줄에 하나씩 둔다(A11Y 글자 200%).
 * 카드 하나에 설명의 가장 긴 낱말(13 · 다섯 글자, 약 3.5em)과 좌우 여백(2em)이 들어가는 폭 5.5em 에 사이 간격(0.5em)을 더했다.
 * 기본 배율의 360·390 폭에서는 지금처럼 나란히 놓이고, 글자를 키우면 낱말 가운데에서 갈리기 전에 한 줄에 하나가 된다.
 */
const CARD_COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 @min-[11.6em]:grid-cols-2",
  3: "grid-cols-1 @min-[17.6em]:grid-cols-3",
  4: "grid-cols-1 @min-[23.6em]:grid-cols-4",
} as const;

/** 모양별 묶음 배치. 선택 버튼·카드는 한 줄에 여러 개를 나란히 둔다(S38, S40). 선택 행은 12 간격으로 쌓는다(S55a). */
const LAYOUT: Record<Variant, string> = {
  list: "flex flex-col",
  choice: "grid gap-2",
  card: "grid gap-2",
  "card-row": "flex flex-col gap-3",
};

export type RadioGroupProps = GroupLabelProps & {
  readonly value: string | undefined;
  readonly onValueChange: (value: string) => void;
  /**
   * 모양. 동작은 모두 같고(radiogroup / radio, 방향키로 포커스와 선택이 함께 이동) 보이는 모양만 다르다.
   * - list: 라디오 목록 행. 표시 18 이 왼쪽, 고르면 행 면 ui-layer + 굵은 이름(필터 시트의 소분류 등)
   * - choice: 선택 버튼(이름은 <button> 과 헷갈리지 않게 choice). 라벨만 가운데. 최소 높이 md 52 · sm 44(가입 정보 S38, 문의 유형 S40).
   *   글자를 키워 이름이 두 줄이 되면 버튼이 늘어난다
   * - card 는 글자를 키워 한 줄에 다 들지 않으면 한 줄에 하나씩 놓는다(CARD_COLUMNS)
   * - card: 선택 카드. 그림 + 이름 + 설명, 고르면 오른쪽 위 체크(피부 타입)
   * - card-row: 선택 행. 폭 전체, 표시 24 가 오른쪽(마이페이지 S55a·b)
   */
  readonly variant: Variant;
  /** choice 모양의 최소 높이. md 52 · sm 44 */
  readonly size?: "md" | "sm";
  /** choice·card 모양에서 한 줄에 둘 개수. 같은 줄의 선택지는 폭을 나눠 쓴다. */
  readonly columns?: 1 | 2 | 3 | 4;
  readonly disabled?: boolean;
  /**
   * 비어 있는 문구 자리를 지킬지. 기본은 지켜서 오류가 생겨도 아래 내용이 밀리지 않는다.
   * 안내도 오류도 생기지 않는 묶음(평가 시트의 질문 등)만 끈다.
   */
  readonly reserveMessage?: boolean;
  readonly children: ReactNode;
  /** 묶음의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

/**
 * 하나만 고르는 선택지 묶음(STATE S06 '하나만 선택', A11Y D04).
 *
 * 선택지마다 네이티브 radio 를 시각적으로 숨기고 행·카드 전체를 누르는 영역으로 쓴다. 그래서 Tab 은 고른 선택지(없으면 첫
 * 선택지)에 들어가고, 방향키는 포커스와 선택을 함께 옮긴다. 포커스 링은 행·카드 전체에 그린다(S11 .choice-row).
 */
export function RadioGroup({
  label,
  optional = false,
  hint,
  error,
  value,
  onValueChange,
  variant,
  size = "md",
  columns = 2,
  disabled = false,
  reserveMessage = true,
  children,
  className,
  ...aria
}: RadioGroupProps) {
  const name = useId();
  const labelId = `${name}-label`;
  const messageId = `${name}-message`;
  const grid = variant === "choice" ? COLUMNS[columns] : undefined;

  const visible = hasVisibleLabel(label);

  const group = (
    <div
      role="radiogroup"
      aria-labelledby={!visible ? aria["aria-labelledby"] : labelId}
      aria-label={!visible ? aria["aria-label"] : undefined}
      aria-describedby={visible && (reserveMessage || error || hint) ? messageId : undefined}
      aria-required={!visible || optional ? undefined : true}
      aria-invalid={error ? true : undefined}
      className={cn(variant === "card" ? "@container" : [LAYOUT[variant], grid], !visible && className)}
    >
      <RadioGroupContext value={{ name, value, onValueChange, variant, size, disabled }}>
        {/* 선택 카드는 묶음 폭을 재어 열 수를 정하므로, 폭을 재는 칸(@container) 안에 격자를 한 겹 더 둔다. */}
        {variant === "card" ? <div className={cn(LAYOUT.card, CARD_COLUMNS[columns])}>{children}</div> : children}
      </RadioGroupContext>
    </div>
  );

  if (!visible) return group;

  return (
    <FieldFrame
      label={label}
      labelId={labelId}
      optional={optional}
      messageId={messageId}
      hint={hint}
      error={error}
      reserveMessage={reserveMessage}
      className={className}
    >
      {group}
    </FieldFrame>
  );
}

export type RadioGroupItemProps = {
  readonly value: string;
  /** 선택지 이름 */
  readonly children: ReactNode;
  /** 한 줄 설명. card·card-row 모양에서 이름 아래에 둔다. */
  readonly description?: ReactNode;
  /** 그림. card 는 28, card-row 는 32 칸에 맞춰 넣는다. 옆 글자가 뜻을 전하므로 alt 는 비운다. */
  readonly image?: ReactNode;
  readonly disabled?: boolean;
};

/**
 * 모양별 선택지. 막힌 선택지는 전체를 흐리게 한다(S06).
 * 누를 때 크기는 바꾸지 않는다. 누르는 순간 선택 모양이 바뀌므로, 크기까지 바뀌면 움찔해 보인다(STATE S07).
 */
const ITEM: Record<Variant, string> = {
  list: "fb-surface h-12 gap-2 rounded-md pr-3 pl-6 data-checked:bg-layer",
  choice: "choice-outline fb-surface justify-center gap-1 rounded-lg bg-background px-3",
  card: "choice-outline fb-surface flex-col items-stretch gap-2 rounded-lg bg-background p-4 text-left",
  "card-row": "choice-outline fb-surface h-18 gap-3 rounded-lg bg-background px-4",
};

export function RadioGroupItem({ value, children, description, image, disabled = false }: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error("RadioGroupItem 은 RadioGroup 안에 둔다.");

  const { variant, size } = context;
  const checked = context.value === value;
  const blocked = disabled || context.disabled;
  const { pressableProps } = usePressable({ disabled: blocked });
  const state = { "data-checked": checked ? "" : undefined, "data-disabled": blocked ? "" : undefined };

  return (
    <label
      {...pressableProps}
      {...state}
      className={cn(
        "choice-row pressable flex items-center select-none",
        "data-disabled:opacity-(--disabled-opacity)",
        ITEM[variant],
        // 높이는 최소값이다. 글자를 키워 이름이 두 줄이 되면 버튼이 늘어나 아래로 넘치지 않는다(text-scale-check).
        variant === "choice" && (size === "md" ? "min-h-13 py-2" : "min-h-11 py-2"),
      )}
    >
      <input
        type="radio"
        name={context.name}
        value={value}
        checked={checked}
        disabled={blocked}
        onChange={() => context.onValueChange(value)}
        className="sr-only"
      />

      {variant === "list" ? <RadioIndicator checked={checked} size="sm" /> : null}

      {variant === "list" ? (
        <span
          className={cn(
            "min-w-0 flex-1 text-title",
            checked ? "font-semibold text-text-primary" : "font-medium text-text-body",
          )}
        >
          {children}
        </span>
      ) : null}

      {variant === "choice" ? (
        /*
         * 줄 높이는 text-title 의 기본(snug, 21)을 쓴다. tight(1.3)로 줄이면 줄 상자가 19.5 로 반 픽셀이 되어,
         * 칸 가운데에 놓을 때 글자가 1px 위로 붙어 그려진다(Pretendard, DPR 2 · 3에서 확인).
         */
        <span
          className={cn(
            "text-center text-title leading-snug font-semibold break-keep",
            checked ? "text-text-primary" : "text-text-body",
          )}
        >
          {children}
        </span>
      ) : null}

      {variant === "card" ? (
        <>
          <span className="flex items-center justify-between">
            <span className="flex size-7 items-center justify-center [&>img]:size-full [&>img]:object-contain">
              {image}
            </span>
            {checked ? <Icon name="circle-check" size={20} className="text-text-primary" /> : null}
          </span>
          <span className={cn("text-title text-text-primary", checked ? "font-bold" : "font-semibold")}>
            {children}
          </span>
          {description ? <span className="text-body-sm break-keep text-text-secondary">{description}</span> : null}
        </>
      ) : null}

      {variant === "card-row" ? (
        <>
          {image ? (
            <span className="flex size-8 shrink-0 items-center justify-center [&>img]:size-full [&>img]:object-contain">
              {image}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-title text-text-primary">{children}</span>
            {description ? <span className="text-body-sm leading-snug text-text-secondary">{description}</span> : null}
          </span>
          <RadioIndicator checked={checked} size="md" />
        </>
      ) : null}
    </label>
  );
}

/** 라디오 표시(명세 APP · 라디오). 원 24 에 점 8, 목록 행에서는 원 18 에 점 6 이다. */
function RadioIndicator({ checked, size }: { readonly checked: boolean; readonly size: "md" | "sm" }) {
  return (
    <span
      aria-hidden="true"
      data-checked={checked ? "" : undefined}
      className={cn("radio-indicator", size === "md" ? "size-6" : "size-4.5")}
    >
      {checked ? <span className={cn("rounded-full bg-background", size === "md" ? "size-2" : "size-1.5")} /> : null}
    </span>
  );
}
