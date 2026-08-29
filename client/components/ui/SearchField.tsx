"use client";

import { Icon } from "./icons/Icon";

type SearchFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly onSubmit?: () => void;
  /**
   * 한글은 자모를 모으는 동안에도 입력값이 바뀐다. `ㄷ` 과 `도` 처럼 아직 완성되지
   * 않은 글자로 목록을 거르면 곧 사라질 결과가 잠깐씩 스친다.
   * 조합이 끝난 값만 쓰고 싶은 화면이 이 값을 받아 판단한다.
   */
  readonly onChangeComposing?: (composing: boolean) => void;
};

/**
 * 디자인 C06. 검색 입력은 화면마다 같은 모양을 쓴다.
 *
 * 평소에는 회색으로 조용히 있다가 입력할 때 흰 배경과 테두리로 또렷해진다.
 * 지우기 버튼은 입력이 있을 때만 보인다.
 */
export function SearchField({ value, onChange, placeholder, label, onSubmit, onChangeComposing }: SearchFieldProps) {
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
        onCompositionStart={() => onChangeComposing?.(true)}
        /*
         * 조합이 끝나는 순간의 값은 이 이벤트에만 실려 온다. onChange 가 먼저 오는
         * 브라우저가 있어 값을 함께 넘겨 두어야 마지막 글자가 빠지지 않는다.
         */
        onCompositionEnd={(event) => {
          onChangeComposing?.(false);
          onChange(event.currentTarget.value);
        }}
        /*
         * 보이는 글자 크기는 디자인(C06)대로 14px 이지만 font-size 는 16px 이다.
         * 까닭과 계산은 globals.css 의 `.search-field-input` 에 적어 두었다.
         *
         * 브라우저 기본 지우기 버튼은 숨기고 디자인의 버튼만 쓴다.
         */
        className="search-field-input min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-[#868B94] [&::-webkit-search-cancel-button]:appearance-none"
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
