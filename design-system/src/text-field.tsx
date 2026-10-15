"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import type { NameProps } from "./accessible-name";
import { hasVisibleLabel } from "./accessible-name";
import { FieldFrame } from "./field-frame";
import type { FieldRule } from "./field-rule";
import { useFieldError } from "./field-rule";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "className" | "children" | "aria-label" | "aria-labelledby"
> &
  NameProps & {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly type?: "text" | "email" | "tel" | "url" | "search" | "password" | "number";
    /** 고르지 않아도 되는 칸. 라벨 옆에 '선택'을 붙인다. 기본은 필수다. */
    readonly optional?: boolean;
    /** 칸 아래 안내 문구. 오류가 있으면 그 자리에 오류를 보여 준다. */
    readonly hint?: ReactNode;
    /** 검사 규칙. 오류를 언제 보여 줄지는 규칙의 validateOn 을 따른다. */
    readonly rule?: FieldRule;
    /** 제출 뒤 서버가 돌려준 오류. 규칙과 상관없이 바로 보여 준다. 값을 고치면 화면이 지운다. */
    readonly serverError?: string;
    /** 틀(라벨·칸·문구 묶음)의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
    readonly className?: string;
    readonly ref?: Ref<HTMLInputElement>;
  };

/**
 * 한 줄 입력(명세 APP · 입력 · 한 줄). 높이 48, 모서리 sm, 좌우 12 의 회색 칸이다.
 * 입력 중에는 흰 면과 진한 테두리, 오류면 빨간 테두리가 된다(STATE S06, .field).
 */
export function TextField({
  label,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  value,
  onChange,
  type = "text",
  optional = false,
  hint,
  rule,
  serverError,
  className,
  id,
  onBlur,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const messageId = `${inputId}-message`;
  const { error, markTouched, onBlur: checkOnBlur } = useFieldError(value, rule, serverError);

  return (
    <FieldFrame
      label={label}
      labelFor={inputId}
      labelId={labelId}
      optional={optional}
      messageId={messageId}
      hint={hint}
      error={error}
      className={className}
    >
      <div className="field flex h-12 items-center rounded-sm px-3">
        <div className="min-w-0 flex-1">
          <input
            {...rest}
            id={inputId}
            type={type}
            value={value}
            aria-label={hasVisibleLabel(label) ? undefined : ariaLabel}
            aria-labelledby={hasVisibleLabel(label) ? undefined : ariaLabelledBy}
            aria-required={optional ? undefined : true}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            onChange={(event) => {
              markTouched();
              onChange(event.target.value);
            }}
            onBlur={(event) => {
              checkOnBlur();
              onBlur?.(event);
            }}
            className="field-control block"
          />
        </div>
      </div>
    </FieldFrame>
  );
}
