"use client";

import { useCallback, useId, useLayoutEffect, useRef } from "react";
import type { ReactNode, Ref, TextareaHTMLAttributes } from "react";

import type { NameProps } from "./accessible-name";
import { hasVisibleLabel } from "./accessible-name";
import { FieldFrame } from "./field-frame";
import type { FieldRule } from "./field-rule";
import { useFieldError } from "./field-rule";

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "className" | "children" | "rows" | "aria-label" | "aria-labelledby"
> &
  NameProps & {
    readonly value: string;
    readonly onChange: (value: string) => void;
    /** 고르지 않아도 되는 칸. 라벨 옆에 '선택'을 붙인다. 기본은 필수다. */
    readonly optional?: boolean;
    /** 칸 아래 안내 문구. 오류가 있으면 그 자리에 오류를 보여 준다. */
    readonly hint?: ReactNode;
    /** 검사 규칙. 오류를 언제 보여 줄지는 규칙의 validateOn 을 따른다. */
    readonly rule?: FieldRule;
    /** 제출 뒤 서버가 돌려준 오류. 규칙과 상관없이 바로 보여 준다. 값을 고치면 화면이 지운다. */
    readonly serverError?: string;
    /**
     * 글자 수를 세는 방법. 기본은 입력한 글자 그대로다. 앞뒤 공백을 빼고 보내는 칸은 그 기준으로 세어,
     * 보이는 글자 수와 검사·제출의 기준이 어긋나지 않게 한다.
     */
    readonly countOf?: (value: string) => number;
    /** 틀(라벨·칸·문구 묶음)의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
    readonly className?: string;
    readonly ref?: Ref<HTMLTextAreaElement>;
  };

/** .field-control 이 글자를 줄이는 비율(16px → 14px) */
const SCALE = 0.875;
/** 칸이 늘어나는 한도. 이보다 길면 칸 안에서 스크롤한다. */
const MAX_LINES = 5;

/**
 * 여러 줄 입력(명세 APP · 입력 · 여러 줄). 회색 칸, 모서리 sm, 안쪽 12, 최소 높이 140 이다.
 * 입력이 늘면 5줄 분량까지 칸이 자라고, 그 뒤로는 칸 안에서 스크롤한다. maxLength 를 주면 오른쪽 아래에 글자 수를 둔다.
 */
export function TextArea({
  label,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  value,
  onChange,
  optional = false,
  hint,
  rule,
  serverError,
  countOf = (current) => current.length,
  className,
  id,
  maxLength,
  onBlur,
  ref,
  ...rest
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const messageId = `${inputId}-message`;
  const { error, markTouched, onBlur: checkOnBlur } = useFieldError(value, rule, serverError);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /*
   * 글자를 scale 로 줄였기 때문에 textarea 가 차지하는 자리(줄이기 전)와 보이는 크기(줄인 뒤)가 다르다.
   * 그래서 textarea 는 글자 칸 위에 띄워 두고, 보이는 높이를 재서 글자 칸의 높이를 직접 맞춘다.
   */
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const area = areaRef.current;
    if (!textarea || !area) return;

    area.style.minHeight = "";
    textarea.style.height = "auto";
    const available = area.clientHeight;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 0;
    const content = textarea.scrollHeight * SCALE;
    const limit = lineHeight * MAX_LINES * SCALE;
    const visible = Math.max(available, Math.min(content, limit));

    area.style.minHeight = `${visible}px`;
    textarea.style.height = `${visible / SCALE}px`;
    textarea.style.overflowY = content > limit ? "auto" : "hidden";
  }, [value]);

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
      <div className="field flex min-h-35 flex-col gap-2 rounded-sm p-3">
        <div ref={areaRef} className="relative min-h-0 flex-1">
          <textarea
            {...rest}
            ref={setTextareaRef}
            id={inputId}
            value={value}
            rows={1}
            maxLength={maxLength}
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
            className="field-control absolute top-0 left-0 block resize-none"
          />
        </div>

        {/* 남은 분량을 눈으로 볼 수 있어야 한도에 걸려 놀라지 않는다. 낭독기는 maxLength 로 한도를 안다. */}
        {maxLength === undefined ? null : (
          <span aria-hidden="true" className="self-end text-caption text-text-secondary">
            {countOf(value).toLocaleString("ko-KR")} / {maxLength.toLocaleString("ko-KR")}
          </span>
        )}
      </div>
    </FieldFrame>
  );
}
