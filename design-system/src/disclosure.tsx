"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { warnIfNameless } from "./accessible-name-check";
import { cn } from "./cn";
import { Glyph } from "./icons";
import { Slot } from "./slot";
import { usePressable } from "./use-pressable";

type GroupContextValue = {
  readonly isOpen: (value: string) => boolean;
  readonly toggle: (value: string) => void;
};

const GroupContext = createContext<GroupContextValue | null>(null);

type DisclosureContextValue = {
  readonly open: boolean;
  readonly toggle: () => void;
  readonly triggerId: string;
  readonly contentId: string;
};

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

const useDisclosure = (part: string) => {
  const context = useContext(DisclosureContext);
  if (!context) throw new Error(`${part} 는 Disclosure 안에 둔다.`);
  return context;
};

export type DisclosureGroupProps =
  | {
      /** 하나만 펼친다. 다른 것을 펼치면 앞의 것은 접힌다(카테고리 시트 대분류). */
      readonly type: "single";
      readonly value?: string | undefined;
      readonly defaultValue?: string;
      readonly onValueChange?: (value: string | undefined) => void;
      readonly children: ReactNode;
    }
  | {
      /** 따로 열고 닫는다(선반 소개의 자주 묻는 질문). */
      readonly type: "multiple";
      readonly value?: readonly string[];
      readonly defaultValue?: readonly string[];
      readonly onValueChange?: (value: readonly string[]) => void;
      readonly children: ReactNode;
    };

/**
 * 여러 Disclosure 의 펼침 상태를 한곳에서 관리한다. value 를 주면 화면이 상태를 들고, 주지 않으면 부품이 든다.
 * 안의 Disclosure 마다 value 를 준다.
 */
export function DisclosureGroup(props: DisclosureGroupProps) {
  const [inner, setInner] = useState<string | undefined | readonly string[]>(
    props.type === "single" ? props.defaultValue : (props.defaultValue ?? []),
  );
  const current = props.value !== undefined ? props.value : inner;

  const context: GroupContextValue =
    props.type === "single"
      ? {
          isOpen: (value) => current === value,
          toggle: (value) => {
            const next = current === value ? undefined : value;
            if (props.value === undefined) setInner(next);
            props.onValueChange?.(next);
          },
        }
      : {
          isOpen: (value) => (current as readonly string[]).includes(value),
          toggle: (value) => {
            const list = current as readonly string[];
            const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
            if (props.value === undefined) setInner(next);
            props.onValueChange?.(next);
          },
        };

  return <GroupContext value={context}>{props.children}</GroupContext>;
}

export type DisclosureProps = {
  /** DisclosureGroup 안에서 이 항목을 가리키는 값 */
  readonly value?: string;
  /** 홀로 쓸 때 처음 펼침 여부 */
  readonly defaultOpen?: boolean;
  /** 홀로 쓸 때 화면이 펼침 상태를 들면 넘긴다. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** DisclosureTrigger 와 DisclosureContent */
  readonly children: ReactNode;
};

/**
 * 누르면 그 자리에서 내용을 펼치고 접는 동작(STATE S06 · A11Y D04). 동작만 맡고 행 모양은 client 의 도메인 컴포넌트가 맡는다.
 * 펼칠 때 꺾쇠만 180° 돌고(150ms), 내용은 즉시 나타나고 사라진다(MOTION '펼치기 · 접기').
 */
export function Disclosure({ value, defaultOpen = false, open, onOpenChange, children }: DisclosureProps) {
  const group = useContext(GroupContext);
  const [inner, setInner] = useState(defaultOpen);
  const baseId = useId();

  if (group && value === undefined) throw new Error("DisclosureGroup 안의 Disclosure 에는 value 를 준다.");

  const isOpen = group && value !== undefined ? group.isOpen(value) : (open ?? inner);
  const toggle = () => {
    if (group && value !== undefined) {
      group.toggle(value);
      return;
    }
    if (open === undefined) setInner(!isOpen);
    onOpenChange?.(!isOpen);
  };

  return (
    <DisclosureContext value={{ open: isOpen, toggle, triggerId: `${baseId}-trigger`, contentId: `${baseId}-content` }}>
      {children}
    </DisclosureContext>
  );
}

export type DisclosureTriggerProps = {
  /**
   * 행이 될 버튼 요소 하나. client 가 행 모양을 정한 <button> 을 넘긴다. 부품은 aria-expanded · aria-controls ·
   * data-state 와 hover·눌림 상태(data-hovered · data-pressed, STATE S11)를 붙인다.
   * client 는 행 모양에 맞는 fb-* 유틸리티 하나를 고르고(질문 행 fb-surface, 회색 면 위 묶음 머리 행 fb-border 등),
   * 펼친 모양은 data-state="open" 으로 꾸민다. 목록 행이라 크기 피드백(press-scale)은 붙이지 않는다(S07).
   * 이름은 버튼의 글자에서 온다. 버튼에 aria-label 을 주면 그대로 남는다.
   */
  readonly children: ReactElement;
};

export function DisclosureTrigger({ children }: DisclosureTriggerProps) {
  const { open, toggle, triggerId, contentId } = useDisclosure("DisclosureTrigger");
  const { pressableProps } = usePressable();

  // 이름은 넘겨받은 버튼의 글자에서 와서 타입으로 막을 수 없다. 개발 환경에서 그린 뒤에 확인한다.
  useEffect(() => {
    warnIfNameless(document.getElementById(triggerId), "DisclosureTrigger");
  }, [triggerId]);

  return (
    <Slot
      {...pressableProps}
      className="pressable"
      id={triggerId}
      aria-expanded={open}
      aria-controls={contentId}
      data-state={open ? "open" : "closed"}
      onClick={toggle}
    >
      {children}
    </Slot>
  );
}

export type DisclosureContentProps = {
  readonly children: ReactNode;
  /** 자리. 모양은 client 가 정한다. */
  readonly className?: string;
};

/**
 * 펼친 내용. 접히면 숨긴다. 펼치고 접는 움직임은 없다.
 * region 역할은 두지 않는다. 자주 묻는 질문처럼 항목이 많으면 랜드마크가 늘어 낭독기의 이동 목록이 어지러워진다.
 */
export function DisclosureContent({ children, className }: DisclosureContentProps) {
  const { open, contentId } = useDisclosure("DisclosureContent");

  return (
    <div id={contentId} hidden={!open} className={className}>
      {children}
    </div>
  );
}

/**
 * 펼침 꺾쇠. 펼치면 180° 돈다(150ms, MOTION '펼치기 · 접기'). 움직임 줄이기에서는 돌지 않고 바로 바뀐다.
 * 색은 놓인 행의 글자색을 따른다.
 */
export function DisclosureIcon({ size = 20, className }: { readonly size?: number; readonly className?: string }) {
  const { open } = useDisclosure("DisclosureIcon");

  return (
    <Glyph
      name="chevron-down"
      size={size}
      className={cn(
        "shrink-0 transition-transform duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none",
        open && "rotate-180",
        className,
      )}
    />
  );
}
