"use client";

import { Icon } from "./icons/Icon";

type SearchFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly onSubmit?: () => void;
};

/**
 * 디자인 C06. 검색 입력은 화면마다 같은 모양을 쓴다.
 *
 * 평소에는 회색으로 조용히 있다가 입력할 때 흰 배경과 테두리로 또렷해진다.
 * 지우기 버튼은 입력이 있을 때만 보인다.
 */
export function SearchField({ value, onChange, placeholder, label, onSubmit }: SearchFieldProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="flex h-12 items-center gap-2.5 rounded-xl border border-transparent bg-[#F3F4F5] px-3.5 transition-colors focus-within:border-[#212124] focus-within:bg-white"
    >
      <Icon name="search" size={18} className="text-[#8B8D94]" />

      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        /*
         * 글자는 16px 이어야 한다. iOS Safari 는 초점이 간 입력의 글자가 그보다 작으면
         * 읽기 좋게 화면을 저절로 키우고, 빠져나와도 키운 채로 둔다. 디자인(C06)은
         * 14px 이지만 확대를 막으려면 이 크기를 지켜야 한다.
         *
         * 브라우저 기본 지우기 버튼은 숨기고 디자인의 버튼만 쓴다.
         */
        className="flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-[#868B94] [&::-webkit-search-cancel-button]:appearance-none"
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
