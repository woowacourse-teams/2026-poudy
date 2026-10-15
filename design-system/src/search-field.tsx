"use client";

import { useRef } from "react";
import type { InputHTMLAttributes, Ref } from "react";

import { cn } from "./cn";
import { Glyph } from "./icons";
import { usePressable } from "./use-pressable";

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "className" | "children" | "onSubmit"
> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** 접근 가능한 이름. 보이는 라벨이 없으므로 반드시 넘긴다. */
  readonly label: string;
  readonly placeholder: string;
  /** Enter 로 검색을 보낼 때 부른다. */
  readonly onSubmit?: () => void;
  /**
   * 한글은 자모를 모으는 동안에도 입력값이 바뀐다. `ㄷ` 과 `도` 처럼 아직 완성되지 않은 글자로 목록을 거르면
   * 곧 사라질 결과가 잠깐씩 스친다. 조합이 끝난 값만 쓰고 싶은 화면이 이 값을 받아 판단한다.
   */
  readonly onChangeComposing?: (composing: boolean) => void;
  /** 바깥 틀의 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
  readonly ref?: Ref<HTMLInputElement>;
};

/**
 * 검색 입력(명세 APP · 검색 입력 · 기본 / 입력 중). 입력 칸만 맡고, 결과 목록과 잇는 일은 Combobox 가 한다.
 *
 * 평소에는 회색 칸이고, 입력 중에는 흰 면과 진한 테두리가 된다(.field). 값이 있으면 오른쪽 끝에 지우기 버튼이 붙는다.
 * 지우기 버튼은 보이는 원이 24 이고 누르는 영역은 입력 칸 오른쪽 끝 44×44 다(A11Y D12). 시트 안에서도 같은 부품이
 * 폭을 채운다.
 */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  onSubmit,
  onChangeComposing,
  className,
  ref,
  ...rest
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className={cn("w-full", className)}
    >
      <div className="field flex h-12 items-center gap-2 rounded-sm px-3">
        <Glyph name="search" size={20} className="shrink-0 text-text-secondary" />

        <div className="min-w-0 flex-1">
          <input
            {...rest}
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            type="search"
            aria-label={label}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onCompositionStart={(event) => {
              onChangeComposing?.(true);
              rest.onCompositionStart?.(event);
            }}
            /*
             * 조합이 끝나는 순간의 값은 이 이벤트에만 실려 온다. onChange 가 먼저 오는 브라우저가 있어 값을 함께 넘겨
             * 두어야 마지막 글자가 빠지지 않는다.
             */
            onCompositionEnd={(event) => {
              onChangeComposing?.(false);
              onChange(event.currentTarget.value);
              rest.onCompositionEnd?.(event);
            }}
            className="field-control block"
          />
        </div>

        {value ? (
          <ClearButton
            onClear={() => {
              onChange("");
              inputRef.current?.focus();
            }}
          />
        ) : null}
      </div>
    </form>
  );
}

/**
 * 지우기 버튼. 회색 원(ui-layer)을 누르거나 올리면 한 단계 진해진다(명세의 fb-border: ui-layer → ui-border).
 * 원은 안쪽 칸이 그리고, 버튼 자체는 칸 오른쪽 끝까지 닿는 투명한 44 영역이다. 오른쪽 여백(12)을 넘어 칸 끝에서 2 안쪽까지
 * 넓혀, 보이는 원의 자리는 명세와 같게 둔다.
 */
function ClearButton({ onClear }: { readonly onClear: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label="검색어 지우기"
      {...pressableProps}
      onClick={onClear}
      className="pressable group -mr-2.5 flex size-11 shrink-0 items-center justify-center rounded-full"
    >
      <span
        data-focus-ring=""
        className="flex size-6 items-center justify-center rounded-full bg-layer text-text-secondary transition-colors duration-(--duration-fast) group-data-hovered:bg-border group-data-pressed:bg-border"
      >
        <Glyph name="x" size={14} />
      </span>
    </button>
  );
}
