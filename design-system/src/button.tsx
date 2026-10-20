"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
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
 *
 * 기기 글자 크기를 키워도 글자가 버튼 밖으로 넘치지 않게 한다(text-scale-check).
 * - 높이는 최소 높이로 둔다. 기본 배율에서는 48·56 그대로이고, 글자가 한 줄에 들어가지 않으면 낱말 단위로 줄을 넘기며 버튼이 커진다.
 * - 앞뒤 아이콘은 em 으로 그린다(text-16 + size-em). 기본 배율에서는 명세의 16 이고, 글자를 따라 함께 커진다.
 * - outline 은 목록 행 안의 짧은 낱말이라 줄을 넘기지 않는다. text 는 말줄임으로 자른다.
 */
const buttonVariants = cva(
  // 앞뒤 아이콘(16)은 Icon 의 scalable 과 같은 방식(text-16 + size-em)으로 그려 글자 크기를 따라 커지게 한다.
  "pressable inline-flex items-center justify-center gap-2 rounded-xl text-center break-keep select-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed [&>svg]:size-em [&>svg]:shrink-0 [&>svg]:text-16",
  {
    variants: {
      variant: {
        primary: "press-scale fb-dim bg-action text-action-text",
        secondary: "press-scale fb-secondary bg-button-secondary text-text-primary",
        destructive: "press-scale fb-danger bg-danger-action text-action-text",
        // 보이는 높이는 32 지만 누르는 영역은 위아래로 넓혀 44 를 지킨다(A11Y D12).
        outline:
          "press-scale fb-surface h-8 border border-border-strong bg-background px-3 text-13 leading-none font-semibold whitespace-nowrap text-text-primary after:absolute after:-inset-y-1.5 after:inset-x-0",
        // 행이라 크기는 바꾸지 않고 색만 바꾼다(STATE S07).
        text: "fb-surface h-11 w-full justify-between rounded-none px-0 text-14 leading-none font-semibold text-text-primary",
      },
      size: {
        md: "min-h-12 px-4 py-3 text-14 leading-none font-semibold",
        lg: "min-h-14 px-6 py-3 text-16 leading-none font-bold",
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
   * 확정한 뒤 처리 중이다. 다시 누를 수 없고 aria-busy 를 알린다(S06).
   * 라벨과 아이콘은 자리를 지킨 채 보이지 않게 하고, 그 가운데에 진행 표시(16)를 겹친다. 그래서 폭이 바뀌지 않고,
   * 라벨이 DOM 에 남아 버튼 이름도 그대로다. text 변형은 명세에 처리 중 모양이 없어 진행 표시를 그리지 않는다.
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
  const showsProgress = busy && variant !== "text";

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
      className={cn(
        buttonVariants({ variant, size: fixedSize ? null : size }),
        // 진행 표시 말고 바로 아래의 라벨·아이콘을 모두 숨긴다. 자리는 남으므로 폭이 그대로다.
        showsProgress && "[&>:not([data-progress])]:opacity-0",
        className,
      )}
    >
      {leadingIcon}
      {/* 처리 중에 라벨을 숨기려면 글자도 요소여야 한다. */}
      <span className={variant === "text" ? "min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap" : undefined}>
        {children}
      </span>
      {trailingIcon}
      {showsProgress ? (
        <span data-progress="" className="absolute inset-0 flex items-center justify-center">
          <Icon name="loader-2" size={16} scalable className="animate-spinner" />
        </span>
      ) : null}
    </button>
  );
}
