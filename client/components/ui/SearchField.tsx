"use client";

type SearchFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly onSubmit?: () => void;
};

/** 디자인 C06. 지우기 버튼은 입력이 있을 때만 보인다. */
export function SearchField({ value, onChange, placeholder, label, onSubmit }: SearchFieldProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="flex h-12 items-center gap-2 rounded-xl bg-surface px-3.5"
    >
      <SearchIcon />

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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#C7C9CE" />
            <path d="M5.5 5.5l5 5m0-5-5 5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" stroke="#8B8D94" strokeWidth="1.5" />
      <path d="M12 12l3.5 3.5" stroke="#8B8D94" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
