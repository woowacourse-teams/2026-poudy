"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { chainHandlers, usePressable } from "./use-pressable";

export type ToggleChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children" | "className" | "onClick" | "aria-pressed"
> & {
  readonly pressed: boolean;
  readonly onPressedChange: (pressed: boolean) => void;
  /** 칩 글자. 접근 가능한 이름이 되므로 반드시 넘긴다. */
  readonly children: NonNullable<ReactNode>;
  /** md 36(본문 선택 칩, 빠른 필터) · sm 32(헤더 보조 칩, 범위 슬라이더의 '상관없음') */
  readonly size?: "md" | "sm";
  /** 자리. 모양은 부품이 정하므로 여백만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 눌러서 켜고 끄는 칩(명세 APP · 빠른 필터, STATE S06: button + aria-pressed).
 *
 * 켜지면 테두리가 1.5 ui-text-primary, 글자가 ui-text-primary 가 된다. 체크 아이콘은 두지 않고 굵기도 두 상태 모두 600 이라,
 * 켜고 꺼도 칩의 폭과 글자 자리가 움직이지 않는다. 늘어난 테두리 0.5 는 안쪽 그림자로 그린다(choice-outline).
 * 누를 때 크기는 바꾸지 않고 면 색만 바꾼다. 누르는 순간 선택 모양도 바뀌므로, 크기까지 바뀌면 움찔해 보인다(STATE S07).
 * 보이는 높이보다 누르는 영역을 위아래로 넓혀 44 를 지킨다(A11Y D12).
 */
export function ToggleChip({ pressed, onPressedChange, children, size = "md", className, ...rest }: ToggleChipProps) {
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
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "choice-outline pressable fb-surface inline-flex shrink-0 items-center justify-center rounded-full bg-background px-5 text-body leading-none font-semibold whitespace-nowrap select-none after:absolute after:inset-x-0",
        size === "md" ? "h-9 after:-inset-y-1" : "h-8 after:-inset-y-1.5",
        pressed ? "text-text-primary" : "text-text-body",
        className,
      )}
    >
      {children}
    </button>
  );
}

export type ToggleGroupProps = ({ readonly "aria-label": string } | { readonly "aria-labelledby": string }) & {
  /** ToggleChip 들. 묶음 안 방향키 이동은 쓰지 않고, 칩마다 Tab 으로 멈춘다(A11Y D04). */
  readonly children: ReactNode;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

/**
 * 켜고 끄는 칩 묶음(빠른 필터 줄). 하나만 고르는 것이 아니어서 RadioGroup 과 다르다. 칩은 글자 길이에 맞춰 늘어나고,
 * 여러 줄로 흘려 놓는다. 묶음 이름은 보이는 섹션 제목을 aria-labelledby 로 가리키거나 aria-label 로 준다.
 */
export function ToggleGroup({ children, className, ...name }: ToggleGroupProps) {
  return (
    <div role="group" {...name} className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
