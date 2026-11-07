"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

import { cn } from "./cn";
import { Slot } from "./slot";
import { usePressable } from "./use-pressable";

type Variant = "underline" | "rail";

type TabsContextValue = {
  readonly baseId: string;
  readonly value: string | undefined;
  readonly onValueChange: (value: string) => void;
  readonly variant: Variant;
  readonly layout: TabsLayout;
  readonly slide: boolean;
  /** 마지막으로 고른 것이 키보드였다. 그때는 밑줄을 옮기지 않고 바로 그린다(MOTION M03). */
  readonly instant: boolean;
  readonly setInstant: (instant: boolean) => void;
};

/**
 * 밑줄 탭의 배치.
 * - fixed: 탭이 폭을 똑같이 나눈다.
 * - scroll: 내용 폭대로 두고 넘치면 가로로 민다.
 * - fit: 다 들어가면 fixed 처럼 폭을 나누고, 넘치면 scroll 처럼 내용 폭대로 민다. 구성품 탭처럼 개수와 이름 길이,
 *   기기 글자 크기에 따라 같은 화면에서도 달라질 때 쓴다. 판단은 CSS 가 맡아 그린 뒤에 재지 않는다.
 * scroll 과 fit 은 가로 트랙이라 양옆에 거터를 둔다(LAYOUT L09). fit 이 폭을 나눌 때도 거터 안쪽 폭을 나눈다.
 */
export type TabsLayout = "fixed" | "scroll" | "fit";

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabs = (part: string) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${part} 는 Tabs 안에 둔다.`);
  return context;
};

const idPart = (value: string) => value.replace(/[^\w-]/g, "_");
const tabId = (baseId: string, value: string) =>
  `${baseId}-tab-${idPart(value)}`;
const panelId = (baseId: string, value: string) =>
  `${baseId}-panel-${idPart(value)}`;

export type TabsProps = {
  readonly value: string | undefined;
  /** 탭을 고를 때 부른다. 링크 탭(asChild)은 링크가 이동을 맡으므로 주소에서 값을 읽어 넘기면 된다. */
  readonly onValueChange: (value: string) => void;
  /**
   * - underline: 밑줄 탭(구성품 탭). 고른 탭은 굵은 글자 + 2px 밑줄. 높이는 최소 44 이고 내용이 크면 따라간다.
   * - rail: 세로 레일(디렉터리 레일). 회색 레일 위에서 고른 항목만 흰 면이다. 높이 52.
   */
  readonly variant?: Variant;
  /** underline 의 배치(TabsLayout). */
  readonly layout?: TabsLayout;
  /**
   * underline 에서 고른 탭이 바뀔 때 밑줄이 이전 탭에서 새 탭으로 미끄러지게 한다. 밑줄은 탭 줄에 하나만 두고 자리만
   * 옮기므로, 링크 탭(asChild)은 화면을 옮겨도 탭 줄이 다시 그려지지 않는 곳(레이아웃)에 둔다.
   */
  readonly slide?: boolean;
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
  slide = false,
  children,
}: TabsProps) {
  const baseId = useId();
  const [instant, setInstant] = useState(false);
  return (
    <TabsContext
      value={{
        baseId,
        value,
        onValueChange,
        variant,
        layout,
        slide,
        instant,
        setInstant,
      }}
    >
      {children}
    </TabsContext>
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
  const { value, variant, layout, slide, instant } = useTabs("TabList");
  const listRef = useRef<HTMLDivElement>(null);
  const vertical = variant === "rail";
  const sliding = slide && !vertical;
  // 밑줄의 자리는 고른 탭이 몇 번째인지로 정한다. 탭은 TabList 의 바로 아래 자식으로 둔다.
  const values = Children.toArray(children).flatMap((child) =>
    isValidElement<{ readonly value?: unknown }>(child) &&
    typeof child.props.value === "string"
      ? [child.props.value]
      : [],
  );
  const selectedIndex = value === undefined ? -1 : values.indexOf(value);

  // 스크롤 배치에서 고른 탭이 보이지 않으면 보이도록 민다. 공유받은 주소로 들어와 뒤쪽 탭이 골라져 있을 때다.
  useEffect(() => {
    const list = listRef.current;
    if (!list || vertical || layout === "fixed") return;
    const tab = list.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (!tab) return;
    /*
     * 위치는 브라우저가 맞춘다. offsetLeft 는 목록이 아니라 위치를 가진 조상(body) 기준이라, 앱이 가운데에 놓이는
     * 넓은 화면에서는 맨 앞 탭도 화면 밖에 있다고 잘못 보고 목록을 밀어 '전체'가 잘렸다.
     * 끝에서 띄우는 여유(거터)는 목록의 scroll-padding 이 맡는다. 이미 보이면 움직이지 않는다.
     */
    tab.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [value, vertical, layout]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = vertical
      ? ["ArrowUp", "ArrowDown"]
      : ["ArrowLeft", "ArrowRight"];
    if (![...keys, "Home", "End"].includes(event.key)) return;
    const tabs = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="tab"]:not([aria-disabled="true"])',
      ),
    ];
    const index = tabs.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? tabs[0]
        : event.key === "End"
          ? tabs[tabs.length - 1]
          : tabs[
              (index + (event.key === keys[1] ? 1 : -1) + tabs.length) %
                tabs.length
            ];
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
        /*
         * 가로 트랙은 양옆에 거터를 둔다(LAYOUT L09). 첫 탭 칸(밑줄)이 거터에서 시작하고, 끝까지 밀면 마지막 탭 뒤에도
         * 거터가 남는다. 고른 탭을 보이게 밀 때도 끝에서 거터만큼 띄운다(scrollIntoView 가 scroll-padding 을 따른다).
         */
        !vertical &&
          layout !== "fixed" &&
          "scrollbar-none min-w-0 flex-1 scroll-px-gutter overflow-x-auto px-gutter",
        !vertical && layout === "fixed" && "flex-1",
        sliding && "tab-slider-track relative",
        vertical && className,
      )}
    >
      {children}
      {sliding && selectedIndex >= 0 && layout === "fixed" ? (
        <TabSlider
          index={selectedIndex}
          count={values.length}
          instant={instant}
        />
      ) : null}
      {sliding && layout !== "fixed" ? (
        <MeasuredTabSlider
          listRef={listRef}
          value={value}
          tabs={values.join("\n")}
          instant={instant}
        />
      ) : null}
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
  /*
   * 레일은 ↑↓ 로 연달아 옮기는 자리라 면을 바로 칠한다(MOTION M03 키보드 동작). 굵기도 바로 바뀌어 면만 천천히 바뀌면 따로 논다.
   * 레일은 스크롤 칸이라 바깥으로 그린 포커스 링이 좌우에서 잘린다. 링을 칸 안쪽에 그린다.
   */
  rail: "fb-row h-13 px-4 text-title leading-none font-medium text-text-secondary transition-none focus-visible:-outline-offset-2 aria-selected:bg-background aria-selected:font-bold aria-selected:text-text-primary",
};

/**
 * 폭을 똑같이 나눈 탭 줄의 밑줄(2px) 하나. 탭 줄과 함께 남아 있어 고른 탭이 바뀌면 translate 만 바꿔 옮긴다.
 * 자리를 재지 않고, 서버가 그린 HTML 에서도 제자리에 있다. 처음 그릴 때는 전환이 일어나지 않는다. Tabs 와 TabNav 가 함께 쓴다.
 */
export function TabSlider({
  index,
  count,
  instant = false,
}: {
  readonly index: number;
  readonly count: number;
  /** 옮기지 않고 바로 그린다. 키보드로 반복해 고를 때다(MOTION M03). */
  readonly instant?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      data-instant={instant ? "" : undefined}
      className="tab-slider pointer-events-none absolute -bottom-px left-0 h-0.5 bg-text-primary"
      style={{ "--tab-index": index, "--tab-count": count } as CSSProperties}
    />
  );
}

/**
 * 폭이 제각각인 탭 줄(scroll · fit)의 밑줄. 고른 탭의 자리와 폭을 재어 1px 막대를 translate · scaleX 로 옮긴다.
 * 레이아웃 속성을 움직이지 않아 화면이 바쁜 동안에도 컴포지터가 그린다. 고른 탭이 바뀔 때와 탭 크기가 바뀔 때(글자 크기,
 * 글꼴 로드, 창 크기)만 잰다. 재기 전(스크립트가 붙기 전)에는 감추고, 고른 탭의 테두리가 밑줄을 맡는다.
 */
function MeasuredTabSlider({
  listRef,
  value,
  tabs,
  instant,
}: {
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly value: string | undefined;
  /** 탭 값 목록. 목록이 통째로 바뀌면(다른 대분류) 옮기지 않고 바로 그린다. */
  readonly tabs: string;
  readonly instant: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const placedTabs = useRef<string | undefined>(undefined);

  const place = useCallback(
    (animate: boolean) => {
      const slider = ref.current;
      const list = listRef.current;
      const tab = list?.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );
      if (!slider || !list || !tab) return;
      // offset* 는 정수로 반올림되어 글자를 키우면 밑줄이 1px 가까이 어긋난다. 소수까지 재고, 트랙이 밀린 만큼 되돌린다.
      const box = tab.getBoundingClientRect();
      const origin = list.getBoundingClientRect();
      if (!animate) slider.dataset.instant = "";
      slider.style.setProperty(
        "--slider-x",
        `${box.left - origin.left + list.scrollLeft - list.clientLeft}px`,
      );
      slider.style.setProperty(
        "--slider-y",
        `${box.bottom - origin.top + list.scrollTop - list.clientTop - 2}px`,
      );
      slider.style.setProperty("--slider-w", String(box.width));
      if (!animate) {
        // 전환 없이 바뀐 값을 먼저 확정해 둔다. 확정 전에 전환을 다시 켜면 바로 그리려던 것이 옮겨 간다.
        void slider.offsetWidth;
        delete slider.dataset.instant;
      }
      list.dataset.sliderReady = "";
    },
    [listRef],
  );

  useLayoutEffect(() => {
    place(placedTabs.current === tabs && !instant);
    placedTabs.current = tabs;
  }, [place, value, tabs, instant]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => place(false));
    observer.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]'))
      observer.observe(tab);
    return () => observer.disconnect();
  }, [listRef, place, tabs]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-tab-slider=""
      className="tab-slider-measured pointer-events-none absolute top-0 left-0 h-0.5 w-px bg-text-primary"
    />
  );
}

/* fit 은 똑같이 나눈 몫(basis-0 · grow)이 내용보다 좁아지면 내용 폭(min-w-max)에서 멈추고, 그때부터 목록이 넘쳐 밀린다. */
const LAYOUT_ITEM: Record<TabsLayout, string> = {
  fixed: "flex-1 basis-0",
  scroll: "min-w-max",
  fit: "min-w-max flex-1 basis-0",
};

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

export function Tab({
  value,
  children,
  asChild = false,
  disabled = false,
}: TabProps) {
  const context = useTabs("Tab");
  const selected = context.value === value;
  const { pressableProps } = usePressable({ disabled });
  const content =
    typeof children === "string" ? <TabLabel>{children}</TabLabel> : children;
  const moving = context.variant === "underline" && context.slide;

  const props = {
    ...pressableProps,
    id: tabId(context.baseId, value),
    role: "tab",
    "aria-selected": selected,
    "aria-controls": selected ? panelId(context.baseId, value) : undefined,
    "aria-disabled": disabled || undefined,
    tabIndex: selected || context.value === undefined ? 0 : -1,
    "data-value": value,
    onClick: (event: MouseEvent) => {
      // 방향키(TabList 의 click())와 Enter·Space 로 고른 클릭은 detail 이 0 이다. 키보드로 반복하는 동작이라 밑줄을 옮기지 않는다.
      context.setInstant(event.detail === 0);
      if (!disabled && !selected) context.onValueChange(value);
    },
    className: cn(
      "pressable flex shrink-0 items-center select-none",
      ITEM[context.variant],
      context.variant === "underline" && LAYOUT_ITEM[context.layout],
      // 폭을 나눈 탭은 테두리 대신 탭 줄의 밑줄이 맡는다. 테두리 자리(2px)는 그대로 둬 높이가 같다. 재는 탭은 잰 뒤에 넘긴다(overlay.css).
      moving &&
        context.layout === "fixed" &&
        "aria-selected:border-transparent",
    ),
  };

  if (asChild) {
    if (typeof children === "string")
      throw new Error("asChild 에는 요소 하나를 넘긴다.");
    return <Slot {...props}>{children as ReactElement}</Slot>;
  }

  return (
    <button type="button" {...props}>
      {content}
    </button>
  );
}

export type TabPanelProps = {
  readonly value: string;
  readonly children: ReactNode;
  /**
   * 고르지 않은 패널도 문서에 그려 두고 hidden 으로 감춘다. 패널 내용이 이미 손에 있어 방향키 자동 전환이 지연 없이
   * 되어야 하거나(A11Y D04 디렉터리 레일), 검색 로봇이 받는 첫 HTML 에 모든 패널의 링크가 남아야 할 때 쓴다.
   */
  readonly keepMounted?: boolean;
  readonly className?: string;
};

/** 탭 패널. 기본은 고른 탭의 패널만 그린다. */
export function TabPanel({
  value,
  children,
  keepMounted = false,
  className,
}: TabPanelProps) {
  const { baseId, value: selected } = useTabs("TabPanel");
  const hidden = selected !== value;
  if (hidden && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      tabIndex={0}
      hidden={hidden}
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
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 font-bold"
      >
        {children}
      </span>
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  );
}
