"use client";

import { Icon } from "./icons/Icon";

type SearchFieldProps = {
  /**
   * outlined 는 탐색 조건 화면의 흰 배경 테두리 필드,
   * filled 는 저장함과 시트에서 쓰는 회색 필드다.
   */
  readonly variant?: "filled" | "outlined";
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly onSubmit?: () => void;
};

/** 디자인 C06. 지우기 버튼은 입력이 있을 때만 보인다. */
export function SearchField({ value, onChange, placeholder, label, onSubmit, variant = "filled" }: SearchFieldProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className={`flex items-center gap-2.5 ${
        variant === "outlined"
          ? "h-12 rounded-lg border border-[#D1D3D8] bg-white px-3 focus-within:border-[#212124]"
          : "h-12 rounded-xl bg-surface px-3.5"
      }`}
    >
      <Icon name="search" size={18} className="text-[#8B8D94]" />

      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        // 브라우저 기본 지우기 버튼을 숨기고 디자인의 버튼만 쓴다.
        className="flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          className="flex size-8 items-center justify-center"
        >
          <Icon name="x" size={16} className="text-[#8B8D94]" />
        </button>
      ) : null}
    </form>
  );
}
