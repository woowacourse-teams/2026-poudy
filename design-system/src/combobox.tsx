"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";

import { cn } from "./cn";
import type { SearchFieldProps } from "./search-field";
import { SearchField } from "./search-field";
import { usePressable } from "./use-pressable";

/** 입력이 멈춘 뒤 검색을 보내기까지 기다리는 시간(A11Y D04) */
const SEARCH_DELAY_MS = 300;
/** 입력이 멈춘 뒤 결과 수를 알리기까지 기다리는 시간(A11Y D06) */
const ANNOUNCE_DELAY_MS = 500;

type ComboboxContextValue = {
  readonly value: string;
  readonly change: (value: string) => void;
  readonly expanded: boolean;
  readonly listId: string;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly activeId: string | undefined;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

const useCombobox = (part: string) => {
  const context = useContext(ComboboxContext);
  if (!context) throw new Error(`${part} 는 Combobox 안에 둔다.`);
  return context;
};

export type ComboboxProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** 결과 목록을 보여 줄지. 결과가 있을 때 화면이 켠다. Esc 로 닫은 목록은 다시 입력할 때까지 닫혀 있다. */
  readonly open: boolean;
  /** 입력이 300ms 멈추면 그 값으로 부른다. 결과를 받아 오는 일은 화면이 한다. */
  readonly onSearch?: (query: string) => void;
  /**
   * 결과를 한 문장으로 알린다. 예: '판테 결과 4개', '판테롤과 맞는 성분이 없어요'.
   * 입력이 500ms 멈춘 뒤 라이브 영역으로 한 번 읽어 준다. 입력하는 동안에는 읽지 않는다.
   */
  readonly status?: string;
  /** ComboboxInput 과 ComboboxList 를 화면 배치대로 넣는다. 둘 사이에 다른 요소가 있어도 된다. */
  readonly children: ReactNode;
};

/**
 * 검색 입력과 결과 목록을 잇는다(A11Y D04·D06). 상태와 키보드 처리만 맡고, 입력과 목록을 어디에 둘지는 화면이 정한다.
 *
 * 입력 칸이 combobox 이고, 목록은 listbox, 후보는 option 이다. 후보를 키보드로 옮겨도 포커스는 입력 칸에 그대로 두고,
 * 가리키는 후보를 aria-activedescendant 로 알린다.
 *
 * - ↓ 는 다음 후보로, ↑ 는 앞 후보로 간다. 첫 후보에서 ↑ 를 누르면 입력으로 돌아온다.
 * - Enter 는 후보를 가리키고 있으면 그 후보를 고르고, 아니면 검색을 보낸다(ComboboxInput 의 onSubmit).
 * - Esc 는 가리키던 후보를 풀고 목록을 닫는다.
 *
 * 무엇을 골랐는지(상세로 이동, 성분 담기 등)는 후보마다 화면이 onSelect 로 정한다. 그 결과 상태도 화면이 들고 있는다.
 * 그리는 것은 결과 수를 알리는 보이지 않는 라이브 영역 하나뿐이다.
 */
export function Combobox({ value, onChange, open, onSearch, status, children }: ComboboxProps) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);
  const expanded = open && !dismissed;

  // 사용자가 입력한 뒤에만 검색한다. 처음 그릴 때 받은 값으로는 보내지 않는다.
  const edited = useRef(false);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    if (!edited.current) return;
    const timer = setTimeout(() => onSearchRef.current?.(value), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(status ?? ""), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, value]);

  const change = (next: string) => {
    edited.current = true;
    setActiveId(undefined);
    setDismissed(false);
    onChange(next);
  };

  const point = (target: HTMLElement | undefined) => {
    setActiveId(target?.id);
    target?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;

    const options = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []),
    ];
    const index = options.findIndex((option) => option.id === activeId);

    if (event.key === "ArrowDown" && expanded && options.length > 0) {
      event.preventDefault();
      point(options[Math.min(index + 1, options.length - 1)]);
    } else if (event.key === "ArrowUp" && index >= 0) {
      event.preventDefault();
      point(index > 0 ? options[index - 1] : undefined);
    } else if (event.key === "Enter" && index >= 0) {
      event.preventDefault();
      options[index]?.click();
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setActiveId(undefined);
      setDismissed(true);
    }
  };

  return (
    <ComboboxContext
      value={{ value, change, expanded, listId, listRef, activeId: expanded ? activeId : undefined, handleKeyDown }}
    >
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </ComboboxContext>
  );
}

export type ComboboxInputProps = Omit<
  SearchFieldProps,
  "value" | "onChange" | "role" | "aria-expanded" | "aria-controls" | "aria-activedescendant" | "aria-autocomplete"
>;

/** 결과 목록과 이어진 검색 입력. 모양은 SearchField 와 같다. */
export function ComboboxInput({ onKeyDown, ...rest }: ComboboxInputProps) {
  const { value, change, expanded, listId, activeId, handleKeyDown } = useCombobox("ComboboxInput");

  return (
    <SearchField
      {...rest}
      value={value}
      onChange={change}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls={listId}
      aria-activedescendant={activeId}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        handleKeyDown(event);
      }}
    />
  );
}

export type ComboboxListProps = {
  /** 목록의 이름. 예: '제품 자동완성' */
  readonly label: string;
  readonly children: ReactNode;
  /** 목록의 자리. 명세의 목록은 면·그림자 없이 본문 흐름에 놓이므로 모양은 정하지 않는다. */
  readonly className?: string;
};

/** 결과 목록. 목록이 닫히면 숨긴다. 안에는 ComboboxOption 과 ComboboxGroup 만 넣는다. */
export function ComboboxList({ label, children, className }: ComboboxListProps) {
  const { expanded, listId, listRef } = useCombobox("ComboboxList");

  return (
    <div ref={listRef} id={listId} role="listbox" aria-label={label} hidden={!expanded} className={className}>
      {children}
    </div>
  );
}

export type ComboboxGroupProps = {
  /** 묶음의 머리. 모양은 화면이 넣는다(예: 목록 구분 머리). 낭독기는 이 글을 묶음의 이름으로 읽는다. */
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * 후보 묶음. 목록 안에 제목 줄을 둘 때 쓴다. listbox 안에는 후보와 묶음만 둘 수 있어, 제목을 그냥 넣으면 안 된다.
 * 머리는 묶음의 이름이 되고, 키보드 이동은 머리를 건너뛰고 후보만 옮겨 다닌다.
 */
export function ComboboxGroup({ label, children, className }: ComboboxGroupProps) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className={className}>
      <div id={labelId} role="presentation">
        {label}
      </div>
      {children}
    </div>
  );
}

export type ComboboxOptionProps = {
  /** 이 후보를 골랐을 때. 누르거나, 가리킨 채 Enter 를 눌렀을 때 부른다. */
  readonly onSelect: () => void;
  /** 고를 수 없는 후보(이미 담긴 성분 등). 키보드로 가리킬 수 없고 눌러도 고르지 않는다. */
  readonly disabled?: boolean;
  readonly children: ReactNode;
  /** 행의 자리. 모양은 안에 넣는 도메인 컴포넌트가 정한다. */
  readonly className?: string;
};

/**
 * 결과 목록의 후보 하나. 키보드로 가리키면 hover 와 같은 면(ui-hover)이 깔린다.
 * 누르는 동안 입력 칸이 포커스를 잃지 않게 mousedown 의 기본 동작을 막는다.
 */
export function ComboboxOption({ onSelect, disabled = false, children, className }: ComboboxOptionProps) {
  const id = useId();
  const active = useCombobox("ComboboxOption").activeId === id;
  const { pressableProps } = usePressable({ disabled });

  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      data-active={active ? "" : undefined}
      {...pressableProps}
      onMouseDown={(event) => event.preventDefault()}
      onClick={disabled ? undefined : onSelect}
      className={cn("pressable fb-surface block cursor-pointer data-active:bg-hover", className)}
    >
      {children}
    </div>
  );
}
