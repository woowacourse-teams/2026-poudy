"use client";

import { cloneElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import type { IconName } from "./icon";
import { Slot } from "./slot";
import { usePressable } from "./use-pressable";

/**
 * 띠의 색. 서비스 소식(공지)은 brand, 기기·브라우저 안내(앱에서 열기)는 neutral 이다.
 * 두 띠가 함께 떠도 같은 무게로 보이지 않게 색으로만 나눈다.
 */
export type TopStripTone = "brand" | "neutral";

/**
 * 띠를 눌렀을 때 할 일. 다른 화면으로 가면 링크(client 의 Link)를 asChild 로 넘기고, 앱을 여는 것처럼 화면 밖의
 * 일을 하면 onClick 을 넘긴다.
 */
export type TopStripAction =
  | {
      /** 띠 영역이 될 링크 하나. 안의 아이콘과 문구는 부품이 채운다. */
      readonly asChild: ReactElement;
      readonly onClick?: undefined;
    }
  | {
      readonly onClick: () => void;
      readonly asChild?: undefined;
    };

export type TopStripProps = {
  /** 띠 영역의 이름. 화면 읽기 프로그램이 영역으로 알린다(예: '공지 알림, 3개'). */
  readonly label: string;
  readonly tone: TopStripTone;
  /** 문구 앞 아이콘. 글자와 함께 커진다. */
  readonly icon: IconName;
  /** 한 줄 문구. 넘치면 말줄임한다. 바뀌면 새 문구가 아래에서 올라온다. */
  readonly children: string;
  readonly action: TopStripAction;
  /** ✕ 를 누르면 부른다. 닫았다는 기억은 쓰는 쪽이 맡는다. */
  readonly onClose: () => void;
  /** 닫기 버튼의 이름(예: '공지 알림 닫기'). */
  readonly closeLabel: string;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

const TONE_CLASS = {
  brand: "bg-brand-soft text-brand-text",
  neutral: "bg-surface text-text-primary",
} as const satisfies Record<TopStripTone, string>;

/**
 * 화면 맨 위(상태 표시줄 아래, 상단 내비 위)에 붙는 한 줄 띠(명세 APP · 공지 띠, APP · 앱에서 열기 띠, LAYOUT L04 '상단 띠').
 *
 * 높이 44, 폭 전체. 아이콘 · 문구 영역 전체가 링크나 버튼 하나이고, ✕ 는 그 옆의 따로 된 버튼이다. 닫기가 링크 안에
 * 겹치지 않아 닫으려다 이동하는 일이 없다. 띠 영역 눌림은 면 전체에, ✕ 눌림은 지름 32 원에 덮개를 얹는다(fb-overlay,
 * 색 바탕이라 한 단계 진한 면을 정할 수 없다). ✕ 는 보이는 원이 32 이고 누르는 영역은 44 다(A11Y D12).
 *
 * 문구가 바뀌면 새 문구가 아래에서 올라온다(overlay.css [data-top-strip-text]). 처음 그릴 때는 움직이지 않는다.
 * 동작 줄이기에서는 움직임 없이 문구만 바뀐다. 문구가 바뀌어도 읽어 주지 않는다. 몇 개가 도는지는 label 로 알린다.
 */
export function TopStrip({ label, tone, icon, children, action, onClose, closeLabel, className }: TopStripProps) {
  const { pressableProps } = usePressable();
  // 처음 문구에서 한 번이라도 바뀐 뒤에만 올라오게 한다. 첫 화면에서 띠가 움직이면 눈길을 빼앗는다.
  const [initial] = useState(children);
  const [moved, setMoved] = useState(false);
  if (!moved && children !== initial) setMoved(true);

  const content = (
    <>
      <Icon name={icon} size={14} scalable className="shrink-0" />
      {/* 글자가 줄 높이(1)에 딱 붙어 말줄임 칸이 아래 획을 자르지 않게 위아래 2 를 띄운다. */}
      <span className="min-w-0 flex-1 overflow-hidden py-0.5">
        <span
          key={children}
          data-top-strip-text={moved ? "" : undefined}
          className="block truncate text-body-sm leading-none font-semibold"
        >
          {children}
        </span>
      </span>
    </>
  );
  const areaClass =
    "pressable fb-overlay flex min-w-0 flex-1 items-center gap-2 self-stretch pl-(--gutter) text-left select-none";

  return (
    <section aria-label={label} className={cn("flex min-h-11 items-center pr-0.5", TONE_CLASS[tone], className)}>
      {action.asChild ? (
        <Slot {...pressableProps} className={areaClass}>
          {cloneElement(action.asChild as ReactElement<{ readonly children?: ReactNode }>, { children: content })}
        </Slot>
      ) : (
        <button type="button" {...pressableProps} onClick={action.onClick} className={areaClass}>
          {content}
        </button>
      )}
      <CloseButton label={closeLabel} onClick={onClose} />
    </section>
  );
}

/**
 * 띠의 닫기. 보이는 원은 32 이고 누르는 영역은 44 다. 바깥 여백 6 으로 띠 안에서 44 칸을 차지해, 오른쪽 여백(2)과 합쳐
 * ✕ 글리프가 화면 끝에서 16 에 보인다.
 */
function CloseButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={label}
      {...pressableProps}
      onClick={onClick}
      className="pressable fb-overlay m-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary before:absolute before:-inset-1.5"
    >
      <Icon name="x" size={16} />
    </button>
  );
}
