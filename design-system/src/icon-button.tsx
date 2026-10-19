"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { chainHandlers, usePressable } from "./use-pressable";

/**
 * 아이콘만 있는 버튼(명세 BTN · Icon). 누르는 영역은 늘 44×44 이고, 보이는 모양은 변형마다 다르다(A11Y D12).
 *
 * - ghost: 흰 바탕 위 투명 버튼. 앱바 오른쪽, 큰 제목 내비, 시트 머리의 닫기·공유·도움말. 아이콘 24, 선 2
 * - overlay: 전체화면 사진 뷰어 위 어두운 원. 아이콘 20, 흰색
 * - thumbnail-remove: 썸네일 오른쪽 위의 삭제. 보이는 원은 24 이고 누르는 영역은 44 다
 *
 * Button 과 따로 둔 까닭: 글자가 없어 이름(label)이 꼭 있어야 하고, 보이는 크기와 누르는 영역이 다르며,
 * 피드백(fb-circle, fb-dim)과 포커스 링(원형, 사진 위 이중 링)도 다르다.
 */
const iconButtonVariants = cva(
  "pressable inline-flex size-11 shrink-0 items-center justify-center rounded-full select-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        ghost: "fb-circle text-text-primary [&>svg]:relative [&>svg]:size-6",
        overlay: "fb-dim bg-overlay-dark text-on-dark [&>svg]:size-5",
        // 보이는 원(24)은 안쪽 칸이 그린다. 버튼 자체는 투명한 44 영역이다.
        "thumbnail-remove": "fb-dim p-1 text-action-text [&>span]:size-6 [&>span]:rounded-full [&>span]:bg-action",
      },
      /*
       * 투명 버튼(ghost)의 아이콘 크기. md 는 앱바·시트 머리의 24, sm 은 글자 옆에 붙는 작은 도움말·정보 버튼의 16 이다.
       * 어느 쪽이든 누르는 영역은 44 이고, sm 은 피드백 원도 아이콘에 맞춰 28 로 줄인다.
       * sm 은 글자 옆에 붙으므로 아이콘을 em 으로 그려(text-16 + size-em) 기기 글자 크기를 키우면 옆 글자와 함께 커진다.
       */
      size: {
        md: "",
        sm: "",
      },
    },
    compoundVariants: [{ variant: "ghost", size: "sm", className: "[&>svg]:size-em [&>svg]:text-16 before:inset-2" }],
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "aria-label"> & {
  readonly variant?: NonNullable<IconButtonVariants["variant"]>;
  /** 투명 버튼(ghost)의 아이콘 크기. 글자 옆의 작은 정보 버튼은 sm(16)이다. 기본 md(24). */
  readonly size?: NonNullable<IconButtonVariants["size"]>;
  /** 접근 가능한 이름. 아이콘만 보이므로 반드시 넘긴다(A11Y D05). */
  readonly label: string;
  readonly icon: ReactNode;
  readonly type?: "button" | "submit" | "reset";
  readonly busy?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  variant = "ghost",
  size = "md",
  label,
  icon,
  type = "button",
  busy = false,
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  const ariaDisabled = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  const { pressableProps } = usePressable({
    disabled: Boolean(disabled) || ariaDisabled,
    busy,
  });
  // 사진 위에 놓이는 버튼은 포커스 링 안쪽에 흰 테를 둘러 어떤 사진 위에서도 링이 보이게 한다(STATE S06).
  const onImage = variant === "overlay" || variant === "thumbnail-remove";

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-label={label}
      aria-busy={busy || undefined}
      data-on-image={onImage ? "" : undefined}
      {...pressableProps}
      onPointerDown={chainHandlers(pressableProps.onPointerDown, rest.onPointerDown)}
      onPointerMove={chainHandlers(pressableProps.onPointerMove, rest.onPointerMove)}
      onPointerUp={chainHandlers(pressableProps.onPointerUp, rest.onPointerUp)}
      onPointerCancel={chainHandlers(pressableProps.onPointerCancel, rest.onPointerCancel)}
      onPointerEnter={chainHandlers(pressableProps.onPointerEnter, rest.onPointerEnter)}
      onPointerLeave={chainHandlers(pressableProps.onPointerLeave, rest.onPointerLeave)}
      onClickCapture={chainHandlers(pressableProps.onClickCapture, rest.onClickCapture)}
      className={cn(iconButtonVariants({ variant, size }), className)}
    >
      {variant === "thumbnail-remove" ? (
        <span aria-hidden="true" data-focus-ring="" className="flex items-center justify-center [&>svg]:size-3.5">
          {icon}
        </span>
      ) : (
        icon
      )}
    </button>
  );
}
