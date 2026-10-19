"use client";

import { cloneElement, createContext, useContext, useEffect, useId, useRef, ViewTransition } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { cn } from "./cn";
import { Slot } from "./slot";
import { usePressable } from "./use-pressable";

type Variant = "underline" | "rail";

type TabsContextValue = {
  readonly baseId: string;
  readonly value: string | undefined;
  readonly onValueChange: (value: string) => void;
  readonly variant: Variant;
  readonly layout: "fixed" | "scroll";
  readonly transitionName?: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabs = (part: string) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${part} 는 Tabs 안에 둔다.`);
  return context;
};

const idPart = (value: string) => value.replace(/[^\w-]/g, "_");
const tabId = (baseId: string, value: string) => `${baseId}-tab-${idPart(value)}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${idPart(value)}`;

export type TabsProps = {
  readonly value: string | undefined;
  /** 탭을 고를 때 부른다. 링크 탭(asChild)은 링크가 이동을 맡으므로 주소에서 값을 읽어 넘기면 된다. */
  readonly onValueChange: (value: string) => void;
  /**
   * - underline: 밑줄 탭(구성품 탭). 고른 탭은 굵은 글자 + 2px 밑줄. 높이는 최소 44 이고 내용이 크면 따라간다.
   * - rail: 세로 레일(디렉터리 레일). 회색 레일 위에서 고른 항목만 흰 면이다. 높이 52.
   */
  readonly variant?: Variant;
  /** underline 의 배치. fixed 는 탭이 폭을 똑같이 나누고, scroll 은 내용 폭대로 두고 가로로 민다. */
  readonly layout?: "fixed" | "scroll";
  /**
   * underline 에서 고른 탭이 바뀔 때 밑줄이 이전 탭에서 새 탭으로 옮겨 가게 한다(View Transition 의 이름).
   * 링크 탭(asChild)처럼 고를 때 화면이 새로 그려지는 탭에 쓴다. 화면에 하나뿐인 이름을 넘긴다.
   */
  readonly transitionName?: string;
  readonly children: ReactNode;
};

/**
 * 같은 화면에서 패널만 바꾸는 탭(STATE S06 · A11Y D04). tablist / tab + aria-selected, 패널은 tabpanel + aria-labelledby 다.
 *
 * Tab 으로는 고른 탭 하나에만 들어가고, 방향키(밑줄은 ←→, 레일은 ↑↓)와 Home/End 로 옮기며 바로 고른다(자동 전환).
 * 방향키로 옮길 때는 전환 효과 없이 바로 바꾼다(MOTION M03). 다른 화면으로 가는 탭은 TabNav 를 쓴다.
 */
export function Tabs({
  value,
  onValueChange,
  variant = "underline",
  layout = "fixed",
  transitionName,
  children,
}: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext value={{ baseId, value, onValueChange, variant, layout, transitionName }}>{children}</TabsContext>
  );
}

export type TabListProps = {
  /** 탭 묶음의 이름. 예: '구성품' */
  readonly label: string;
  readonly children: ReactNode;
  /** scroll 배치에서 오른쪽 끝에 고정해 둘 칸. 예: 넘칠 때의 [전체 보기 ⌄](S39c-1). 안의 버튼과 목록은 client 가 넣는다. */
  readonly end?: ReactNode;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

export function TabList({ label, children, end, className }: TabListProps) {
  const { value, variant, layout } = useTabs("TabList");
  const listRef = useRef<HTMLDivElement>(null);
  const vertical = variant === "rail";

  // 스크롤 배치에서 고른 탭이 보이지 않으면 보이도록 민다. 공유받은 주소로 들어와 뒤쪽 탭이 골라져 있을 때다.
  useEffect(() => {
    const list = listRef.current;
    if (!list || vertical || layout !== "scroll") return;
    const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!tab) return;
    /*
     * 위치는 브라우저가 맞춘다. offsetLeft 는 목록이 아니라 위치를 가진 조상(body) 기준이라, 앱이 가운데에 놓이는
     * 넓은 화면에서는 맨 앞 탭도 화면 밖에 있다고 잘못 보고 목록을 밀어 '전체'가 잘렸다.
     * 끝에서 띄우는 여유(24)는 목록의 scroll-padding 이 맡는다. 이미 보이면 움직이지 않는다.
     */
    tab.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [value, vertical, layout]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
    if (![...keys, "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([aria-disabled="true"])')];
    const index = tabs.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? tabs[0]
        : event.key === "End"
          ? tabs[tabs.length - 1]
          : tabs[(index + (event.key === keys[1] ? 1 : -1) + tabs.length) % tabs.length];
    if (!next || next === tabs[index]) return;
    next.focus();
    // 누른 것과 같게 처리한다. 링크 탭이면 링크가 이동을 맡고, 버튼 탭이면 onValueChange 가 불린다.
    next.click();
  };

  const tablist = (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation={vertical ? "vertical" : "horizontal"}
      onKeyDown={onKeyDown}
      className={cn(
        "flex",
        vertical && "flex-col bg-surface",
        // 끝에서 24 를 띄워 고른 탭이 끝을 흐리는 자리에 가리지 않게 한다(scrollIntoView 가 따른다).
        !vertical && layout === "scroll" && "scrollbar-none min-w-0 flex-1 scroll-px-6 overflow-x-auto",
        !vertical && layout === "fixed" && "flex-1",
        vertical && className,
      )}
    >
      {children}
    </div>
  );

  if (vertical) return tablist;

  // 밑줄 탭 줄. 아래 1px 선 위에 고른 탭의 2px 밑줄이 겹친다.
  return (
    <div className={cn("flex border-b border-border", className)}>
      {tablist}
      {end ? <div className="flex shrink-0 items-stretch">{end}</div> : null}
    </div>
  );
}

const ITEM: Record<Variant, string> = {
  underline:
    "fb-surface -mb-px min-h-11 justify-center gap-1 border-b-2 border-transparent px-3 text-body leading-none font-medium whitespace-nowrap text-text-secondary aria-selected:border-text-primary aria-selected:font-bold aria-selected:text-text-primary",
  rail: "fb-row h-13 px-4 text-title leading-none font-medium text-text-secondary aria-selected:bg-background aria-selected:font-bold aria-selected:text-text-primary",
};

/**
 * 밑줄에 View Transition 이름을 단다. ViewTransition 은 Next 가 쓰는 React canary 에만 있어, 없는 환경(테스트 등)에서는
 * 밑줄만 그리고 옮겨 가는 전환은 생략한다.
 */
function IndicatorTransition({ name, children }: { readonly name?: string; readonly children: ReactNode }) {
  if (!ViewTransition) return children;
  return (
    <ViewTransition name={name} share="tab-indicator" default="none">
      {children}
    </ViewTransition>
  );
}

export type TabProps = {
  readonly value: string;
  /**
   * 탭 내용. 탭의 이름이 되므로 반드시 넘긴다. 글자만 있으면 TabLabel 로 감싸 고를 때 폭이 바뀌지 않게 한다.
   * 순서·아이콘이 함께 있으면 이름만 TabLabel 로 감싼다.
   */
  readonly children: NonNullable<ReactNode>;
  /**
   * 넘긴 요소(client 의 Link)를 탭 요소로 쓴다. 고른 탭을 주소에 남길 때 쓴다. 주소로 공유되고, replace 로 기록이 쌓이지
   * 않으며, prefetch 로 바로 바뀐다. 역할과 상태는 부품이 붙인다.
   */
  readonly asChild?: boolean;
  readonly disabled?: boolean;
};

export function Tab({ value, children, asChild = false, disabled = false }: TabProps) {
  const context = useTabs("Tab");
  const selected = context.value === value;
  const { pressableProps } = usePressable({ disabled });
  const content = typeof children === "string" ? <TabLabel>{children}</TabLabel> : children;
  const moving = context.variant === "underline" && context.transitionName !== undefined;

  const props = {
    ...pressableProps,
    id: tabId(context.baseId, value),
    role: "tab",
    "aria-selected": selected,
    "aria-controls": selected ? panelId(context.baseId, value) : undefined,
    "aria-disabled": disabled || undefined,
    tabIndex: selected || context.value === undefined ? 0 : -1,
    "data-value": value,
    onClick: () => {
      if (!disabled && !selected) context.onValueChange(value);
    },
    className: cn(
      "pressable flex shrink-0 cursor-pointer items-center select-none",
      ITEM[context.variant],
      context.variant === "underline" && (context.layout === "fixed" ? "flex-1 basis-0" : "min-w-max"),
      // 밑줄을 옮겨 그릴 때는 테두리 대신 아래 indicator 가 밑줄을 맡는다. 테두리 자리(2px)는 그대로 둬 높이가 같다.
      moving && "aria-selected:border-transparent",
    ),
  };

  /*
   * 고른 탭의 밑줄. 같은 이름을 단 이전 화면의 밑줄에서 이 자리로 옮겨 간다. 브라우저가 transform 으로 옮기므로
   * 위치를 재지 않는다. 고르지 않은 탭에는 두지 않는다.
   */
  const indicator =
    moving && selected ? (
      <IndicatorTransition name={context.transitionName}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 bg-text-primary" />
      </IndicatorTransition>
    ) : null;

  if (asChild) {
    if (typeof children === "string") throw new Error("asChild 에는 요소 하나를 넘긴다.");
    const child = children as ReactElement<{ readonly children?: ReactNode }>;
    return (
      <Slot {...props}>{indicator ? cloneElement(child, undefined, child.props.children, indicator) : child}</Slot>
    );
  }

  return (
    <button type="button" {...props}>
      {content}
      {indicator}
    </button>
  );
}

export type TabPanelProps = {
  readonly value: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/** 탭 패널. 고른 탭의 패널만 그린다. */
export function TabPanel({ value, children, className }: TabPanelProps) {
  const { baseId, value: selected } = useTabs("TabPanel");
  if (selected !== value) return null;

  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * 탭 이름. 고르면 글자가 굵어져도 탭 폭이 바뀌지 않게, 굵은 글자의 폭을 보이지 않는 사본으로 미리 잡아 둔다.
 * 내용 폭대로 놓이는 탭(scroll 배치)에서 고를 때마다 줄이 밀리지 않는다.
 */
export function TabLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-bold">
        {children}
      </span>
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  );
}
