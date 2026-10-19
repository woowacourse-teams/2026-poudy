"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import { TooltipBubble, useTooltip } from "./tooltip";
import { usePressable } from "./use-pressable";

/**
 * 긴 이름을 줄인다. '/'가 들어간 이름은 첫 '/'까지 보이고 나머지는 '…'로 줄인다(예: '비스-베헤닐/…').
 * '/'가 없는 긴 이름은 그대로 두고, 칩 최대 폭에서 말줄임한다.
 */
export const shortenName = (name: string) => {
  const slash = name.indexOf("/");
  return slash < 0 || slash === name.length - 1 ? name : `${name.slice(0, slash + 1)}…`;
};

const TONE = {
  neutral:
    "bg-surface text-text-body [&_svg]:text-text-secondary in-data-hovered:bg-hover-on-surface in-data-pressed:bg-hover-on-surface",
  caution: "bg-danger-soft text-danger-action",
  info: "bg-info-soft text-info-text",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  muted: "bg-surface text-text-secondary",
  ai: "bg-ai-soft text-ai-text",
} as const;

export type TagTone = keyof typeof TONE;

export type TagProps =
  | {
      /**
       * 사용자가 고르거나 담은 항목. 높이 36, 흰 면 + 테두리. onRemove 를 주면 ✕ 로 뺀다. ✕ 를 눌러야 하므로 누르는
       * 높이를 갖는다. 칩 본문은 누르는 동작이 없다. 예: 담은 성분(명세 APP · 선택 성분 칩)
       */
      readonly variant: "item";
      /** 전체 이름. 긴 이름은 줄여 보이고, 전체 이름은 접근 가능한 이름과 길게 누르기 툴팁으로 준다. */
      readonly children: string;
      readonly onRemove?: () => void;
      /** 빼기 버튼의 이름. 기본은 '{이름} 빼기'. 성분군은 '{성분군명} {N}종 빼기'처럼 넘긴다(A11Y D05). */
      readonly removeLabel?: string;
    }
  | {
      /**
       * 걸려 있는 것의 요약. 높이 28, 회색 면. 보여 주기만 하고 누를 수 없어, 요약 줄에 여러 개를 빽빽하게 놓는다.
       * 예: 결과 위 적용된 조건(명세 APP · 적용 조건 칩)
       */
      readonly variant: "summary";
      readonly children: string;
    }
  | {
      /**
       * 정보 태그(명세 APP · 효과 태그 · 주의 태그 · 기능 태그). 높이 24, 글자 11/700. 누를 수 없다.
       * - neutral: 피부 효과. 놓인 행이 hover·눌림이면 면을 한 단계 진하게 해 행 면과 섞이지 않게 한다.
       * - caution: 주의 성분. 경고 아이콘이 붙는다. 목록에서 색을 쓰는 유일한 태그다.
       * - info · success · warning · muted · ai: 기능 태그의 기능군 색(보습 · 진정 · 각질 케어 · 일반 · 기본)
       */
      readonly variant: "label";
      readonly tone: TagTone;
      /** 앞 아이콘(14). 피부 효과 아이콘처럼 도메인이 정한 그림을 넘긴다. caution 은 경고 아이콘을 늘 붙인다. */
      readonly icon?: ReactNode;
      readonly children: ReactNode;
    };

/** 정보를 보여 주는 표시. 칩 모양이지만 누르는 동작은 없고, 선택 성분 칩만 빼기 버튼을 가진다. */
export function Tag(props: TagProps) {
  if (props.variant === "label") {
    return (
      <span
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-label leading-none font-bold [&_svg]:size-3.5 [&_svg]:shrink-0",
          TONE[props.tone],
        )}
      >
        {props.tone === "caution" ? <Icon name="alert-circle" size={14} scalable /> : props.icon}
        {props.children}
      </span>
    );
  }

  return <NameChip {...props} />;
}

function NameChip(props: Extract<TagProps, { readonly variant: "item" | "summary" }>) {
  const name = props.children;
  const short = shortenName(name);
  const textRef = useRef<HTMLSpanElement>(null);
  // 줄였거나 칩 폭에서 잘렸을 때만 툴팁을 연다.
  const { open, anchorRef, anchorProps } = useTooltip(() => {
    const text = textRef.current;
    return short !== name || (text !== null && text.scrollWidth > text.clientWidth);
  });
  const removable = props.variant === "item" && props.onRemove !== undefined;

  return (
    <span
      {...anchorProps}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center rounded-full text-text-primary select-none",
        props.variant === "item"
          ? cn(
              "h-9 gap-1 border border-border-strong bg-background pl-4 text-body leading-none font-semibold",
              removable ? "pr-2" : "pr-4",
            )
          : "h-7 bg-surface px-3 text-body-sm leading-none font-medium",
      )}
    >
      {/* 줄 높이가 1 이라 세로로 자르면 아래로 내려가는 획(g·y)이 잘린다. 가로만 자른다. */}
      <span ref={textRef} aria-hidden="true" className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">
        {short}
      </span>
      <span className="sr-only">{name}</span>

      {props.variant === "item" && props.onRemove ? (
        <RemoveButton label={props.removeLabel ?? `${name} 빼기`} onRemove={props.onRemove} />
      ) : null}

      <TooltipBubble open={open} anchorRef={anchorRef}>
        {name}
      </TooltipBubble>
    </span>
  );
}

/**
 * 칩 안의 빼기 ✕(A11Y D12). 보이는 원은 24 이고, 누르는 영역은 칩 오른쪽 끝 32 × 칩의 누르는 높이 44 다.
 * 칩 본문과 영역을 나눠 쓴다. 누르거나 올리면 원에 ui-hover 면이 깔린다(fb-circle 과 같은 모양).
 */
function RemoveButton({ label, onRemove }: { readonly label: string; readonly onRemove: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={label}
      {...pressableProps}
      onClick={onRemove}
      className="pressable group -my-1 -mr-2 flex h-11 w-8 shrink-0 items-center justify-end pr-2"
    >
      <span
        data-focus-ring=""
        className="flex size-6 items-center justify-center rounded-full text-text-muted transition-colors duration-(--duration-fast) group-data-hovered:bg-hover group-data-pressed:bg-hover group-data-pressed:duration-0"
      >
        <Icon name="x" size={16} />
      </span>
    </button>
  );
}
