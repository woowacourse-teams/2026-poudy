"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from "react";

import { Button } from "./button";
import { cn } from "./cn";
import { IconButton } from "./icon-button";
import { Icon } from "./icon";
import { pushLayer } from "./overlay-stack";
import { Portal } from "./portal";

/** 시트가 닫힌 까닭. 머리의 ✕·뒤로처럼 안에서 닫는 길은 쓰는 쪽이 직접 안다. */
export type SheetCloseReason = "backdrop" | "drag" | "escape" | "close";

/** 열기 전환 시간(slow, 280ms). 전환이 끝났다는 알림이 오지 않을 때의 여유를 잡는 데 쓴다. */
const SLOW_MS = 280;
/** 끌어 놓은 뒤 남은 거리를 움직이는 최대 시간(base, 200ms) */
const BASE_MS = 200;
/** 이 속도 이상으로 튕기면 닫는다(px/ms, MOTION M02) */
const FLICK_VELOCITY = 0.11;
/** 위로 끌 때 끈 거리보다 덜 움직이게 하는 마찰 */
const UPWARD_FRICTION = 0.2;
/** 본문에서 손가락이 이만큼 움직이고 나서야 끌기로 본다. 그 전에는 탭일 수 있다. */
const DRAG_SLOP = 8;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SheetContextValue = {
  readonly titleId: string;
  readonly descriptionId: string;
  readonly titleRef: RefObject<HTMLHeadingElement | null>;
  readonly bodyRef: RefObject<HTMLDivElement | null>;
  readonly close: (reason: SheetCloseReason) => void;
  readonly setHasDescription: (has: boolean) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

const useSheet = (part: string) => {
  const context = useContext(SheetContext);
  if (!context) throw new Error(`${part} 는 BottomSheet 안에 둔다.`);
  return context;
};

export type BottomSheetProps = {
  readonly open: boolean;
  /** 닫혔을 때 까닭과 함께 부른다. Esc · 딤 · 끌어내리기는 모두 취소와 같다(A11Y D02). */
  readonly onClose: (reason: SheetCloseReason) => void;
  /** BottomSheetHeader · BottomSheetBody · BottomSheetFooter 를 쌓는다. */
  readonly children: ReactNode;
  /**
   * 열 때 포커스를 둘 요소. 비우면 시트 제목에 둔다(필터·정보 시트). 확인 시트는 '취소'에 둔다.
   */
  readonly initialFocus?: RefObject<HTMLElement | null>;
  /**
   * 닫은 뒤 포커스를 돌려줄 요소. 비우면 시트를 연 요소로 돌아간다. 연 요소가 사라진 경우(삭제한 사진, 뺀 칩)에는
   * 화면이 다음 형제 → 이전 형제 → 목록 제목 순으로 골라 넘긴다(A11Y D02).
   */
  readonly returnFocus?: () => HTMLElement | null | undefined;
  /** 겹침 층. 확인 시트는 시트·사진 뷰어 위에 뜨는 dialog 층이다(SHAPE E05). ConfirmSheet 가 쓴다. */
  readonly layer?: "sheet" | "dialog";
  /** 시트 면의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

/**
 * 바텀시트 그릇(명세 APP · 바텀시트). 흰 면, 위 모서리 24, 그림자, 핸들. 안의 행은 RadioGroup · CheckboxGroup ·
 * Disclosure 를 그대로 쓰고 시트 전용 행은 만들지 않는다.
 *
 * - 포커스: role="dialog" + aria-modal, 배경 inert, 시트 안에서 Tab 순환, 닫으면 연 요소로 복귀(A11Y D02)
 * - 닫기: Esc · 딤 탭 · 아래로 끌기는 취소와 같다. 맨 위 시트만 Esc 를 받는다.
 * - 전환: 열기 slow · 닫기 base, drawer 곡선. 동작 줄이기에서는 불투명도만 fast(MOTION M02)
 * - 끌어서 닫기: 머리를 잡거나, 본문이 맨 위일 때 본문을 아래로 끈다. 높이의 1/3 넘게 내렸거나 빠르게 튕기면 닫는다.
 * - 높이: 최대 '화면 − 상단 안전 영역 − 24'. 넘치면 본문만 스크롤하고, 키보드가 열리면 그 위까지 줄인다(A11Y D07).
 *   내용이 바뀌어 높이가 달라지면 base · ease-in-out 으로 맞춘다(시트 안 화면 바꾸기).
 */
export function BottomSheet({ open, ...rest }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const exit = useCallback(() => setMounted(false), []);
  if (open && !mounted) setMounted(true);
  if (!mounted) return null;

  return (
    <Portal>
      <Shell open={open} onExited={exit} {...rest} />
    </Portal>
  );
}

function Shell({
  open,
  onClose,
  onExited,
  children,
  initialFocus,
  returnFocus,
  layer = "sheet",
  className,
}: Omit<BottomSheetProps, "open"> & { readonly open: boolean; readonly onExited: () => void }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const [entered, setEntered] = useState(false);
  const [hasDescription, setHasDescription] = useState(false);
  const state = open && entered ? "open" : "closed";

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const close = (reason: SheetCloseReason) => onCloseRef.current(reason);

  // 붙자마자 닫힌 자리에서 그린 뒤 다음 프레임에 연다. 같은 프레임에 열면 전환이 보이지 않는다.
  useEffect(() => {
    if (!open) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);

  // 닫는 전환이 끝나면 지운다. 전환 끝 알림이 오지 않는 환경(전환 없음 등)을 위해 시간으로도 지운다.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(onExited, SLOW_MS + 100);
    return () => clearTimeout(timer);
  }, [open, onExited]);

  // 층에 올리고, 맨 위일 때 Esc 를 받는다. 본문과 아래 층은 inert 가 된다.
  // 층 등록과 포커스 복귀는 layout effect 로 둔다. 시트가 DOM 에서 빠지는 바로 그 순간 inert 를 풀고
  // 포커스를 돌려줘야, 포커스가 잠깐 body 로 떨어지거나 아직 inert 인 요소에 포커스를 주지 않는다.
  useLayoutEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    return pushLayer({ element, onEscape: () => onCloseRef.current("escape") });
  }, []);

  // 연 요소를 기억했다가 닫힌 뒤 돌려준다. 첫 포커스는 제목(읽기 시작점) 또는 넘겨받은 요소다.
  const returnFocusRef = useRef(returnFocus);
  useEffect(() => {
    returnFocusRef.current = returnFocus;
  });
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocus?.current ?? titleRef.current ?? sheetRef.current;
    target?.focus({ preventScroll: true });
    return () => {
      const back = returnFocusRef.current?.() ?? opener;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
    // 붙을 때 한 번만 정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardInset(sheetRef);
  useHeightTransition(sheetRef, open && entered);
  const drag = useDragToDismiss(sheetRef, bodyRef, () => close("drag"));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    // 접힌 내용(hidden)이나 막힌 층(inert) 안의 요소는 건너뛴다.
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (item) => !item.closest("[hidden], [inert]"),
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const dialog = layer === "dialog";

  return (
    <SheetContext value={{ titleId, descriptionId, titleRef, bodyRef, close, setHasDescription }}>
      <div ref={layerRef}>
        <div
          aria-hidden="true"
          data-state={state}
          onClick={() => close("backdrop")}
          // 딤은 앱 화면 폭(시트와 같은 max-w-md)만 덮는다. 넓은 화면에서 앱 바깥 바탕까지 어두워지지 않게 한다.
          className={cn(
            "sheet-scrim fixed inset-y-0 inset-x-0 mx-auto w-full max-w-md",
            dialog ? "z-(--z-dialog-dim)" : "z-(--z-sheet-dim)",
          )}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={hasDescription ? descriptionId : undefined}
          tabIndex={-1}
          data-state={state}
          onKeyDown={onKeyDown}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.propertyName === "height") return;
            event.currentTarget.style.transitionDuration = "";
            if (!open) onExited();
          }}
          {...drag.sheetProps}
          className={cn(
            "sheet-surface fixed inset-x-0 mx-auto flex w-full max-w-md flex-col rounded-t-4xl bg-background shadow-sheet outline-none",
            dialog ? "z-(--z-dialog)" : "z-(--z-sheet)",
            className,
          )}
        >
          {/* 핸들. 4px 로 얇아 손가락으로 놓치기 쉬워, 핸들 칸(20)과 머리 전체를 잡아 끌 수 있게 한다. */}
          <div data-sheet-grab="" className="flex h-5 shrink-0 touch-none items-center justify-center">
            <span aria-hidden="true" className="h-1 w-9 rounded-full bg-icon-subtle" />
          </div>
          {children}
        </div>
      </div>
    </SheetContext>
  );
}

export type BottomSheetHeaderProps = {
  /** 시트 제목. 시트의 이름이 된다. 고르는 대상이나 '무엇을 할지'를 그대로 말한다. */
  readonly title: NonNullable<ReactNode>;
  /** 설명. 제목만으로 결과나 이유를 알 수 없을 때만 쓴다(14 · 보조색, 제목 아래 8). */
  readonly description?: ReactNode;
  /** ✕ 로 닫기. 하단에 취소·닫기 버튼이 없을 때만 둔다(필터·선택 시트). */
  readonly onClose?: () => void;
  /** ‹ 뒤로. 시트 안 단계 화면에서 앞 단계로 돌아간다. */
  readonly onBack?: () => void;
};

/**
 * 시트 머리(LAYOUT L10). 머리 높이는 숫자로 고정하지 않고 위 12 + 버튼 44 + 아래 16 의 여백으로 정한다.
 * - 필터·선택 시트: 제목 + ✕
 * - 확인 시트: 제목(질문) + 설명, ✕ 없음
 * - 설명 시트 · 시트 안 단계 화면: ‹ 뒤로 + 제목
 * 잡아 끌면 시트가 내려간다.
 */
export function BottomSheetHeader({ title, description, onClose, onBack }: BottomSheetHeaderProps) {
  const { titleId, descriptionId, titleRef, setHasDescription } = useSheet("BottomSheetHeader");
  const hasDescription = description !== undefined && description !== null && description !== false;

  useLayoutEffect(() => {
    setHasDescription(hasDescription);
  }, [hasDescription, setHasDescription]);

  return (
    <div data-sheet-grab="" className="flex shrink-0 touch-none flex-col gap-2 px-5 pt-3 pb-4">
      <div className="flex items-center gap-1">
        {onBack ? (
          <IconButton
            label="이전 화면"
            icon={<Icon name="chevron-left" size={24} />}
            onClick={onBack}
            className="-ml-2.5"
          />
        ) : null}
        <h2
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className={cn(
            "min-w-0 flex-1 text-block leading-snug font-bold text-text-primary outline-none",
            (onClose || onBack) && "py-2.5",
          )}
        >
          {title}
        </h2>
        {onClose ? (
          <IconButton label="닫기" icon={<Icon name="x" size={24} />} onClick={onClose} className="-mr-2.5" />
        ) : null}
      </div>
      {hasDescription ? (
        <p id={descriptionId} className="text-body text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** 시트 본문. 넘치면 본문만 스크롤한다. 맨 위에서 아래로 끌면 시트를 끌어 내린다. */
export function BottomSheetBody({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const { bodyRef } = useSheet("BottomSheetBody");

  return (
    <div
      ref={bodyRef}
      data-sheet-body=""
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5", className)}
    >
      {children}
    </div>
  );
}

export type SheetAction = {
  /** 버튼 글자 */
  readonly label: NonNullable<ReactNode>;
  readonly onClick: () => void;
};

export type SheetPrimaryAction = SheetAction & {
  /** 되돌리기 어려운 행동(삭제·빼기)은 destructive */
  readonly tone?: "primary" | "destructive";
  /** 처리 중. 다시 누를 수 없고 aria-busy 를 알린다. */
  readonly busy?: boolean;
  /**
   * 지금 누를 수 없는 이유. 주면 버튼 위에 안내 문구를 두고 버튼을 막는다(aria-disabled + aria-describedby).
   * 필수값이 비었을 때처럼 이유를 알려야 하는 비활성이다(FEEDBACK F06, STATE S06).
   */
  readonly disabledReason?: ReactNode;
  /**
   * 이유 문구 없이 막는다. 버튼 글자가 이미 이유를 말할 때 쓴다(예: '0개 제품 보기').
   * 막는 이유를 따로 알려야 하면 disabledReason 을 쓴다.
   */
  readonly disabled?: boolean;
};

export type BottomSheetFooterProps = {
  /** 주 행동. 오른쪽에 두고, 보조 행동이 있으면 폭 2, 없으면 폭 전체를 쓴다. */
  readonly primary: SheetPrimaryAction;
  /** 보조 행동(예: 초기화). 왼쪽에 폭 1 로 둔다. */
  readonly secondary?: SheetAction;
  /**
   * 버튼 크기. 기본 md(48)는 시트의 적용·초기화 버튼이다. lg(56)는 시트 안에서 다음 단계로 넘어가 행동 하나만 두는
   * 자리(명세 '추가 단계 하단 행동 영역', 예: 성분 검색의 'N개 추가하기')로, 위에 구분선을 두고 하단 행동 영역과 같은 큰 버튼을 쓴다.
   */
  readonly size?: "md" | "lg";
};

/**
 * 시트 발. 버튼은 틀이 그린다. 화면은 버튼의 모양이나 위치를 고르지 않고 무엇을 할지만 넘긴다(#729 원칙).
 * 버튼은 Button md(48, size 로 lg 56), 보조 1 : 주 2, 간격 8 이고, 본문이 스크롤되어도 제자리에 남는다. 아래로 기기의 안전 영역만큼 띄운다.
 * 명세의 시트 하단은 버튼 둘까지다. 더 필요하면 명세에 하단 모양을 먼저 그리고 여기에 더한다.
 */
export function BottomSheetFooter({ primary, secondary, size = "md" }: BottomSheetFooterProps) {
  const reasonId = useId();
  const hasReason =
    primary.disabledReason !== undefined && primary.disabledReason !== null && primary.disabledReason !== false;
  const blocked = hasReason || primary.disabled === true;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 px-5 pb-safe",
        size === "lg" ? "border-t border-border pt-3" : "pt-4",
      )}
    >
      {hasReason ? (
        <p id={reasonId} className="text-center text-caption text-text-secondary">
          {primary.disabledReason}
        </p>
      ) : null}
      <div className="flex gap-2">
        {secondary ? (
          <Button variant="secondary" onClick={secondary.onClick} className="flex-1">
            {secondary.label}
          </Button>
        ) : null}
        <Button
          variant={primary.tone === "destructive" ? "destructive" : "primary"}
          onClick={primary.onClick}
          busy={primary.busy}
          aria-disabled={blocked || undefined}
          aria-describedby={hasReason ? reasonId : undefined}
          size={size}
          className={secondary ? "flex-2" : "flex-1"}
        >
          {primary.label}
        </Button>
      </div>
    </div>
  );
}

/** 시트 제목·설명 id 를 쓰는 다른 머리(확인 시트)가 쓴다. 패키지 안에서만 쓴다. */
export const useSheetParts = () => useSheet("ConfirmSheet");

/* ---------------------------------------------------------------------------------------------------------------- */

/** 가상 키보드가 열리면 시트를 키보드 위로 올리고, 최대 높이를 보이는 화면에 맞춘다(A11Y D07). */
function useKeyboardInset(sheetRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const sheet = sheetRef.current;
    if (!viewport || !sheet) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      sheet.style.setProperty("--sheet-keyboard", `${inset}px`);
      sheet.style.setProperty("--sheet-viewport", `${viewport.height}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [sheetRef]);
}

/**
 * 내용이 바뀌어 시트 높이가 달라지면 이전 높이에서 새 높이로 맞춘다(시트 안 화면 바꾸기, MOTION M02).
 * ResizeObserver 는 그리기 전에 불리므로, 그 자리에서 이전 높이로 되돌렸다가 새 높이로 전환하면 튀지 않는다.
 */
function useHeightTransition(sheetRef: RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !active || typeof ResizeObserver === "undefined") return;
    let previous = sheet.offsetHeight;
    let animating = false;

    const finish = (event: TransitionEvent) => {
      if (event.target !== sheet || event.propertyName !== "height") return;
      animating = false;
      sheet.style.height = "";
      previous = sheet.offsetHeight;
    };
    sheet.addEventListener("transitionend", finish);

    const observer = new ResizeObserver(() => {
      if (animating || sheet.hasAttribute("data-dragging")) return;
      const next = sheet.offsetHeight;
      if (next === previous) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        previous = next;
        return;
      }
      animating = true;
      sheet.style.height = `${previous}px`;
      void sheet.offsetHeight;
      sheet.style.height = `${next}px`;
      previous = next;
    });
    observer.observe(sheet);
    return () => {
      observer.disconnect();
      sheet.removeEventListener("transitionend", finish);
    };
  }, [sheetRef, active]);
}

type Drag = { y: number; startY: number; lastY: number; lastT: number; velocity: number; height: number };

/**
 * 시트를 끌어서 닫는다(MOTION M02). 끄는 동안의 위치는 ref 로 transform 을 직접 바꾼다(다시 그리지 않는다).
 * 머리·핸들은 바로 끌고, 본문은 맨 위(scrollTop 0)에서 아래로 끌 때만 끈다. 처음 닿은 손가락만 따라간다.
 */
function useDragToDismiss(
  sheetRef: RefObject<HTMLDivElement | null>,
  bodyRef: RefObject<HTMLDivElement | null>,
  onDismiss: () => void,
) {
  const drag = useRef<(Drag & { pointerId?: number }) | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const move = (clientY: number) => {
    const sheet = sheetRef.current;
    const current = drag.current;
    if (!sheet || !current) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - current.lastT);
    current.velocity = (clientY - current.lastY) / elapsed;
    current.lastY = clientY;
    current.lastT = now;
    const offset = clientY - current.startY;
    current.y = offset;
    const shown = offset >= 0 ? offset : offset * UPWARD_FRICTION;
    sheet.style.transform = `translateY(${shown}px)`;
  };

  const release = () => {
    const sheet = sheetRef.current;
    const current = drag.current;
    drag.current = null;
    if (!sheet || !current) return;
    sheet.removeAttribute("data-dragging");
    const dismiss = current.y > current.height / 3 || current.velocity >= FLICK_VELOCITY;
    const remaining = dismiss ? current.height - Math.max(0, current.y) : Math.abs(current.y);
    // 남은 거리만큼, 최대 base. 놓은 자리에서 이어서 움직인다.
    sheet.style.transitionDuration = `${Math.round(Math.min(BASE_MS, (BASE_MS * remaining) / Math.max(1, current.height)))}ms`;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 동작 줄이기에서 닫을 때는 놓은 자리에 둔 채 불투명도만 바꾼다. 위치를 되돌리면 한 번 튄다.
    if (!(dismiss && reduce)) sheet.style.transform = "";
    if (dismiss) onDismissRef.current();
  };

  const begin = (clientY: number, pointerId?: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    drag.current = {
      y: 0,
      startY: clientY,
      lastY: clientY,
      lastT: performance.now(),
      velocity: 0,
      height: sheet.offsetHeight,
      pointerId,
    };
    sheet.setAttribute("data-dragging", "");
  };

  // 본문은 터치에서만 끈다. 맨 위에서 아래로 끌기 시작할 때 스크롤 대신 시트를 움직이도록 기본 동작을 막는다.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let start: { id: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = event.touches.length === 1 && touch ? { id: touch.identifier, y: touch.clientY } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = [...event.changedTouches].find((item) => item.identifier === start?.id);
      if (!start || !touch) return;
      if (!drag.current) {
        if (body.scrollTop > 0 || touch.clientY - start.y < DRAG_SLOP) return;
        begin(start.y);
      }
      event.preventDefault();
      move(touch.clientY);
    };
    const onTouchEnd = () => {
      start = null;
      if (drag.current) release();
    };
    body.addEventListener("touchstart", onTouchStart, { passive: true });
    body.addEventListener("touchmove", onTouchMove, { passive: false });
    body.addEventListener("touchend", onTouchEnd);
    body.addEventListener("touchcancel", onTouchEnd);
    return () => {
      body.removeEventListener("touchstart", onTouchStart);
      body.removeEventListener("touchmove", onTouchMove);
      body.removeEventListener("touchend", onTouchEnd);
      body.removeEventListener("touchcancel", onTouchEnd);
    };
    // 시트가 붙어 있는 동안 한 번만 건다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyRef]);

  // 머리와 핸들은 포인터로 끈다. 버튼(✕ · 뒤로)을 누른 것은 끌기로 보지 않는다.
  const sheetProps = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (drag.current || event.button !== 0 || !target.closest("[data-sheet-grab]") || target.closest("button"))
        return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      begin(event.clientY, event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) move(event.clientY);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) release();
    },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) release();
    },
  };

  return { sheetProps };
}
