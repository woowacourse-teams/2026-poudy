"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { chainHandlers, usePressable } from "./use-pressable";

/**
 * 버튼(명세 BTN · 버튼 규격). 모서리는 모두 radius-xl 이다.
 *
 * - primary: 검정 면. 화면의 다음 단계와 시트·다이얼로그의 주 버튼
 * - secondary: 회색 면. 보조 행동
 * - destructive: 빨간 면. 되돌릴 수 없는 삭제·탈퇴의 최종 확인에만
 * - outline: 높이 32 의 테두리 버튼. 목록 행 오른쪽의 가벼운 보조 행동(추가·평가하기)에만
 * - text: 행 전체가 누르는 영역인 글자 버튼(Compact Text). 뒤에 꺾쇠를 둔다
 *
 * 크기 lg(56)는 화면 아래에 고정된 유일한 다음 단계에만 쓴다. 본문 안 버튼은 md(48)다.
 */
const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-xl whitespace-nowrap select-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "press-scale fb-dim bg-action text-action-text",
        secondary: "press-scale fb-secondary bg-button-secondary text-text-primary",
        destructive: "press-scale fb-danger bg-danger-action text-action-text",
        // 보이는 높이는 32 지만 누르는 영역은 위아래로 넓혀 44 를 지킨다(A11Y D12).
        outline:
          "press-scale fb-surface h-8 border border-border-strong bg-background px-3 text-13 leading-none font-semibold text-text-primary after:absolute after:-inset-y-1.5 after:inset-x-0",
        // 행이라 크기는 바꾸지 않고 색만 바꾼다(STATE S07).
        text: "fb-surface h-11 w-full justify-between rounded-none px-0 text-14 leading-none font-semibold text-text-primary",
      },
      size: {
        md: "h-12 px-4 text-14 leading-none font-semibold",
        lg: "h-14 px-6 text-16 leading-none font-bold",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  /** 버튼 글자. 버튼의 이름이 되므로 반드시 넘긴다. 글자 없이 아이콘만 두는 버튼은 IconButton 을 쓴다. */
  readonly children: NonNullable<ReactNode>;
  readonly variant?: NonNullable<ButtonVariants["variant"]>;
  /** primary·secondary·destructive 에만 쓴다. outline 과 text 는 크기가 정해져 있다. */
  readonly size?: NonNullable<ButtonVariants["size"]>;
  readonly type?: "button" | "submit" | "reset";
  /** 앞 아이콘. 16 크기 아이콘을 넘긴다. */
  readonly leadingIcon?: ReactNode;
  /** 뒤 아이콘. text 변형의 꺾쇠도 여기로 넘긴다. */
  readonly trailingIcon?: ReactNode;
  /**
   * 확정한 뒤 처리 중이다. 다시 누를 수 없고 aria-busy 를 알린다. 폭이 바뀌지 않도록 라벨은 그대로 둔다(S06).
   */
  readonly busy?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 이유를 알려야 하는 비활성은 disabled 대신 aria-disabled 와 aria-describedby(안내 문구)를 쓴다.
 * 포커스가 남아 이유를 읽을 수 있고, 누름과 click 은 usePressable 이 막는다(S06·S11 비활성 계약).
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  leadingIcon,
  trailingIcon,
  busy = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const ariaDisabled = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  const { pressableProps } = usePressable({
    disabled: Boolean(disabled) || ariaDisabled,
    busy,
  });
  const fixedSize = variant === "outline" || variant === "text";

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={busy || undefined}
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerMove={chainHandlers(pressableProps.onPointerMove, rest.onPointerMove)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onPointerCancel={chainHandlers(pressableProps.onPointerCancel, rest.onPointerCancel)}
      onPointerEnter={chainHandlers(pressableProps.onPointerEnter, rest.onPointerEnter)}
      onPointerLeave={chainHandlers(pressableProps.onPointerLeave, rest.onPointerLeave)}
      onClickCapture={chainHandlers(pressableProps.onClickCapture, rest.onClickCapture)}
      className={cn(buttonVariants({ variant, size: fixedSize ? null : size }), className)}
    >
      {leadingIcon}
      {variant === "text" ? (
        <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{children}</span>
      ) : (
        children
      )}
      {trailingIcon}
    </button>
  );
}
