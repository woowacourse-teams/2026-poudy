"use client";

import type { ButtonHTMLAttributes, Ref } from "react";

import { cn } from "./cn";
import { Icon, type IconName } from "./icon";
import { chainHandlers, usePressable } from "./use-pressable";

export type FilterChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children" | "className" | "onClick" | "aria-label"
> & {
  /** 조건 이름. 예: '피부 타입' */
  readonly label: string;
  /**
   * 적용된 값을 이름 자리에 바로 쓴다. 예: '건성', '닥터지 외 2개', '성분 3'. 값이 있으면 선택 모양이 된다.
   * 접근 가능한 이름은 '피부 타입, 건성'처럼 조건 이름과 값을 함께 읽는다.
   */
  readonly value?: string;
  /** 조건 시트가 열려 있는지. 열려 있는 동안에도 선택 모양이다. */
  readonly expanded: boolean;
  /** 누르면 부른다. 조건 시트(BottomSheet)는 화면이 연다. */
  readonly onOpen: () => void;
  /** 자리. 모양은 부품이 정하므로 여백만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 필터 칩(명세 APP · 필터 칩). 누르면 조건 시트를 여는 버튼이다(STATE S06: button + aria-haspopup="dialog" + aria-expanded).
 *
 * 보이는 높이는 32 이고 누르는 영역은 위아래로 6 씩 넓혀 44 다(A11Y D12). 좌우로는 넓히지 않는다(칩 사이 8).
 * 평소는 흰 면 + 테두리(fb-surface), 값이 적용됐거나 시트가 열리면 검은 면(fb-dim)이다.
 */
export function FilterChip({ label, value, expanded, onOpen, className, ...rest }: FilterChipProps) {
  const selected = Boolean(value) || expanded;
  const { pressableProps } = usePressable({ disabled: Boolean(rest.disabled) });

  return (
    <button
      {...rest}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={value ? `${label}, ${value}` : undefined}
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onClick={onOpen}
      className={cn(
        "pressable inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-body-sm leading-none font-medium whitespace-nowrap select-none after:absolute after:inset-x-0 after:-inset-y-1.5",
        selected
          ? "fb-dim border-text-primary bg-action text-action-text"
          : "fb-surface border-border-strong bg-background text-text-primary",
        className,
      )}
    >
      {value || label}
      <Icon
        name="chevron-down"
        size={14}
        scalable
        bold={selected}
        className={selected ? "text-background" : "text-text-body"}
      />
    </button>
  );
}

export type FilterResetChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children" | "className" | "onClick" | "aria-label"
> & {
  /** 누르면 부른다. 어떤 조건을 비울지는 화면이 정한다. */
  readonly onReset: () => void;
  /** 접근 가능한 이름. 아이콘만 보이므로 무엇을 비우는지 말한다. */
  readonly label?: string;
  /** 자리. 모양은 부품이 정하므로 여백만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 필터 칩 줄 맨 앞의 초기화 버튼(명세 APP · 필터 초기화 버튼). 32 원 안에 아이콘 16 을 둔다.
 *
 * 칩과 같은 기본 모양(fb-surface, 흰 면 + 테두리)이고, 누르는 영역도 칩처럼 위아래로 6 씩 넓혀 44 다(A11Y D12).
 * 비울 것이 없으면 화면이 disabled 로 막는다. 모양은 비활성 버튼의 공통 규칙(전체를 흐리게)을 따른다.
 */
export function FilterResetChip({
  onReset,
  label = "필터 조건 모두 초기화",
  className,
  ...rest
}: FilterResetChipProps) {
  const { pressableProps } = usePressable({ disabled: Boolean(rest.disabled) });

  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onClick={onReset}
      className={cn(
        "pressable fb-surface inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-text-primary select-none after:absolute after:inset-x-0 after:-inset-y-1.5",
        className,
      )}
    >
      <Icon name="rotate" size={16} />
    </button>
  );
}

export type FilterToggleChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children" | "className" | "onClick" | "aria-pressed"
> & {
  /** 칩 글자. 접근 가능한 이름이 된다. 예: '나만의 필터' */
  readonly label: string;
  /** 글자 앞 아이콘. 시트를 여는 칩과 구별되게 뒤 chevron 대신 앞에 둔다. */
  readonly icon: IconName;
  readonly pressed: boolean;
  /**
   * 누르면 부른다. 바로 켜고 끌지, 먼저 확인 시트를 띄울지는 화면이 정한다.
   * 그래서 ToggleChip 처럼 다음 값을 넘기지 않는다.
   */
  readonly onPress: () => void;
  /** 자리. 모양은 부품이 정하므로 여백만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 필터 칩 줄에서 시트를 열지 않고 바로 켜고 끄는 칩(명세 APP · 필터 토글 칩, STATE S06: button + aria-pressed).
 *
 * 높이와 누르는 영역은 FilterChip 과 같다(보이는 높이 32, 누르는 영역 44). 끄면 흰 면 + 테두리(fb-surface),
 * 켜면 ui-brand-soft 면 + 1.5 ui-brand-text 테두리(fb-dim)다. 시트를 여는 칩의 선택 모양(검정 면)과 나란히 놓여도
 * '바로 켜고 끄는 내 설정'으로 구별되게 검정을 쓰지 않는다. 켜고 꺼도 폭과 글자 자리는 움직이지 않는다.
 */
export function FilterToggleChip({ label, icon, pressed, onPress, className, ...rest }: FilterToggleChipProps) {
  const { pressableProps } = usePressable({ disabled: Boolean(rest.disabled) });

  return (
    <button
      {...rest}
      type="button"
      aria-pressed={pressed}
      data-checked={pressed ? "" : undefined}
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onClick={onPress}
      className={cn(
        "toggle-outline pressable inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-body-sm leading-none font-semibold whitespace-nowrap select-none after:absolute after:inset-x-0 after:-inset-y-1.5",
        pressed ? "fb-dim bg-brand-soft text-brand-text" : "fb-surface bg-background text-text-primary",
        className,
      )}
    >
      <Icon name={icon} size={14} scalable className={pressed ? undefined : "text-text-body"} />
      {label}
    </button>
  );
}
