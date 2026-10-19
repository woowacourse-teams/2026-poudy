"use client";

import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { FieldFrame } from "./field-frame";
import type { GroupLabelProps } from "./accessible-name";
import { hasVisibleLabel } from "./accessible-name";
import { Glyph } from "./icons";
import { usePressable } from "./use-pressable";

type CheckboxGroupContextValue = {
  readonly value: readonly string[];
  readonly toggle: (value: string) => void;
  readonly divided: boolean;
  readonly disabled: boolean;
};

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

export type CheckboxGroupProps = GroupLabelProps & {
  /** 고른 값들. 순서는 화면이 정한다. 새로 고른 값은 끝에 붙인다. */
  readonly value: readonly string[];
  readonly onValueChange: (value: readonly string[]) => void;
  /** 행 사이에 나눔선(아래 1 ui-border)을 둔다. 성분 체크 목록(S53c)처럼 행이 길게 이어질 때 쓴다. */
  readonly divided?: boolean;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  /** 묶음의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

/**
 * 여러 개 고르는 선택지 묶음(STATE S06 '여러 개 선택', A11Y D04). 모양은 체크 목록 행 하나다(명세 APP · 체크 목록 행,
 * APP · 성분 체크 행).
 *
 * 행마다 네이티브 checkbox 를 시각적으로 숨기고 행 전체(높이 48)를 누르는 영역으로 쓴다. Tab 은 행마다 멈추고 Space 로
 * 켜고 끈다. 포커스 링은 행 전체에 그린다(S11 .choice-row).
 */
export function CheckboxGroup({
  label,
  optional = false,
  hint,
  error,
  value,
  onValueChange,
  divided = false,
  disabled = false,
  children,
  className,
  ...aria
}: CheckboxGroupProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;

  const toggle = (item: string) =>
    onValueChange(value.includes(item) ? value.filter((current) => current !== item) : [...value, item]);

  const visible = hasVisibleLabel(label);

  const group = (
    <div
      role="group"
      aria-labelledby={!visible ? aria["aria-labelledby"] : labelId}
      aria-label={!visible ? aria["aria-label"] : undefined}
      aria-describedby={!visible ? undefined : messageId}
      className={cn("flex flex-col", !visible && className)}
    >
      <CheckboxGroupContext value={{ value, toggle, divided, disabled }}>{children}</CheckboxGroupContext>
    </div>
  );

  if (!visible) return group;

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
      {group}
    </FieldFrame>
  );
}

export type CheckboxGroupItemProps = {
  readonly value: string;
  /** 항목 이름 */
  readonly children: ReactNode;
  /** 오른쪽 보조 글자(13, 보조색). 예: '제품 3개에 있음' */
  readonly description?: ReactNode;
  /**
   * 고칠 수 없는 항목. 이미 담겨 있는 항목(S53j)은 value 에 넣은 채 막으면 선택 표시가 ui-border 면으로 흐려진다.
   */
  readonly disabled?: boolean;
};

export function CheckboxGroupItem({ value, children, description, disabled = false }: CheckboxGroupItemProps) {
  const context = useContext(CheckboxGroupContext);
  if (!context) throw new Error("CheckboxGroupItem 은 CheckboxGroup 안에 둔다.");

  const checked = context.value.includes(value);
  const blocked = disabled || context.disabled;
  const { pressableProps } = usePressable({ disabled: blocked });
  const state = { "data-checked": checked ? "" : undefined, "data-disabled": blocked ? "" : undefined };

  return (
    <label
      {...pressableProps}
      {...state}
      className={cn(
        // hover 면은 행의 안쪽 여백을 넘어 시트·화면의 좌우 여백까지 이어 칠한다(fb-bleed 의 가상 요소).
        "choice-row pressable fb-bleed flex h-12 cursor-pointer items-center gap-2 px-1 select-none",
        "data-disabled:cursor-not-allowed",
        context.divided && "border-b border-border",
      )}
    >
      <input
        type="checkbox"
        value={value}
        checked={checked}
        disabled={blocked}
        onChange={() => context.toggle(value)}
        className="sr-only"
      />

      <span aria-hidden="true" {...state} className="checkbox-indicator size-5">
        {checked ? <Glyph name="check" size={14} strokeWidth={3} /> : null}
      </span>

      <span className={cn("min-w-0 flex-1 text-title text-text-primary", checked ? "font-semibold" : "font-medium")}>
        {children}
      </span>

      {description ? (
        <span className="shrink-0 text-body-sm leading-snug text-text-secondary">{description}</span>
      ) : null}
    </label>
  );
}
