"use client";

import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";

import { cn } from "./cn";
import { chainHandlers, usePressable } from "./use-pressable";

/**
 * 알림 안의 글자 버튼. 패키지 안에서만 쓰고 밖으로 내보내지 않는다.
 *
 * 토스트의 [되돌리기], 안내 줄의 행동, 섹션 오류의 [다시 시도]가 쓴다. 셋 다 글자 13/600 이고 보이는 높이는 36 이하지만,
 * 누르는 영역은 위아래로 넓혀 44 를 지킨다(A11Y D12). 놓이는 면이 달라 글자색과 피드백이 다르다.
 * Button 의 변형으로 두지 않은 까닭: 면이 없는 글자 버튼이고, 칠한 면(토스트·안내 줄) 위에 놓여 피드백이 다르다.
 *
 * - on-dark: 토스트(ui-action 면) 위. ui-action-accent 글자, 누르면 옅게(fb-dim)
 * - info: 안내 줄(ui-info-soft 면) 위. ui-info-text 글자, 색 면이라 한 단계를 정할 수 없어 덮개를 얹는다(fb-overlay)
 * - neutral: 회색 면(ui-surface) 위. ui-text-primary 글자, 한 단계 진한 면(fb-border)
 */
const textButtonVariants = cva(
  "pressable inline-flex shrink-0 items-center rounded-sm px-2 text-body-sm leading-none font-semibold whitespace-nowrap select-none before:absolute before:inset-x-0 before:-inset-y-1",
  {
    variants: {
      tone: {
        // 토스트 한 줄 높이(44)를 늘리지 않도록 위아래 여백을 겹친다. 누르는 영역은 그대로 44 다.
        "on-dark": "fb-dim -my-2 h-9 text-action-accent",
        info: "fb-overlay h-9 text-info-text",
        neutral: "fb-border h-9 text-text-primary",
      },
    },
  },
);

export type TextButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  readonly tone: "on-dark" | "info" | "neutral";
  readonly children: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

export function TextButton({ tone, className, children, ...rest }: TextButtonProps) {
  const { pressableProps } = usePressable({ disabled: Boolean(rest.disabled) });

  return (
    <button
      {...rest}
      type="button"
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerMove={chainHandlers(pressableProps.onPointerMove, rest.onPointerMove)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onPointerCancel={chainHandlers(pressableProps.onPointerCancel, rest.onPointerCancel)}
      onPointerEnter={chainHandlers(pressableProps.onPointerEnter, rest.onPointerEnter)}
      onPointerLeave={chainHandlers(pressableProps.onPointerLeave, rest.onPointerLeave)}
      onClickCapture={chainHandlers(pressableProps.onClickCapture, rest.onClickCapture)}
      className={cn(textButtonVariants({ tone }), className)}
    >
      {children}
    </button>
  );
}
