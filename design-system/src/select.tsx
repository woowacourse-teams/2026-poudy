"use client";

import { useId } from "react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { FieldFrame } from "./field-frame";
import { Glyph } from "./icons";

export type SelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "value" | "className" | "children" | "onClick"
> & {
  readonly label: ReactNode;
  /** 고른 값의 이름. 고르기 전이면 비운다. */
  readonly value?: string;
  readonly placeholder: string;
  /** 선택 시트가 열려 있는지. 열려 있는 동안 칸은 '입력 중' 모양이다. */
  readonly expanded: boolean;
  /** 누르면 부른다. 선택 시트(BottomSheet)는 화면이 연다. */
  readonly onOpen: () => void;
  /** 고르지 않아도 되는 칸. 라벨 옆에 '선택'을 붙인다. 기본은 필수다. */
  readonly optional?: boolean;
  readonly hint?: ReactNode;
  /** 보여 줄 오류. 고르는 칸은 칸을 벗어나는 때가 따로 없어, 화면이 정한 때에 넘긴다. */
  readonly error?: string;
  /** 틀(라벨·칸·문구 묶음)의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * 선택 입력(명세 APP · 입력 · 선택). 한 줄 입력과 같은 칸에 오른쪽 ⌄ 가 붙는다. 누르면 선택 시트가 열린다.
 *
 * 시트를 여는 버튼이라 aria-haspopup="dialog" 와 aria-expanded 를 둔다(STATE S06). 접근 가능한 이름은 라벨과 고른 값을
 * 함께 읽는다(예: '브랜드, 라운드랩'). 시트가 닫히면 포커스를 이 버튼으로 돌려주는 일은 BottomSheet 가 맡는다(A11Y D02).
 */
export function Select({
  label,
  value,
  placeholder,
  expanded,
  onOpen,
  optional = false,
  hint,
  error,
  className,
  id,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const labelId = `${buttonId}-label`;
  const valueId = `${buttonId}-value`;
  const messageId = `${buttonId}-message`;

  return (
    <FieldFrame
      label={label}
      labelId={labelId}
      optional={optional}
      messageId={messageId}
      hint={hint}
      error={error}
      className={className}
    >
      <button
        {...rest}
        id={buttonId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={messageId}
        aria-invalid={error ? true : undefined}
        onClick={onOpen}
        /*
         * 입력칸과 같은 면이지만 버튼이라 .field 의 :focus-within 을 쓰지 않는다. 마우스로 눌러도 포커스가 남는
         * 브라우저에서 시트가 닫힌 뒤에도 '입력 중' 모양이 남기 때문이다. 키보드 포커스는 버튼의 포커스 링이 알린다.
         */
        className="flex h-12 w-full items-center gap-2 rounded-sm border border-transparent bg-surface px-3 text-left aria-expanded:border-text-primary aria-expanded:bg-background aria-invalid:border-danger-action"
      >
        <span
          id={valueId}
          className={
            value
              ? "min-w-0 flex-1 truncate text-body font-medium text-text-primary"
              : "min-w-0 flex-1 truncate text-body text-text-secondary"
          }
        >
          {value || placeholder}
        </span>
        <Glyph name="chevron-down" size={16} className="shrink-0 text-text-secondary" />
      </button>
    </FieldFrame>
  );
}
