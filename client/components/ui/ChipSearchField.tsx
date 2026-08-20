"use client";

import { Icon } from "./icons/Icon";

export type SearchChip = {
  readonly key: string;
  readonly kind: "include" | "exclude";
  readonly name: string;
  readonly onRemove: () => void;
};

type ChipSearchFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly chips: readonly SearchChip[];
  /** 입력이 빈 상태에서 지우기를 누르면 마지막 조건을 뺀다. */
  readonly onBackspaceEmpty?: () => void;
};

/**
 * 고른 조건을 입력 안에 함께 담는 검색 칸.
 *
 * 조건을 따로 떨어진 목록에 두면 지금 무엇으로 거르고 있는지와 입력하는 곳이 멀어진다.
 * 담은 조건을 입력 안에 두면 둘을 한눈에 보고 그 자리에서 뺄 수 있다.
 */
export function ChipSearchField({
  value,
  onChange,
  placeholder,
  label,
  chips,
  onBackspaceEmpty,
}: ChipSearchFieldProps) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-transparent bg-[#F3F4F5] px-3 py-2 transition-colors focus-within:border-[#212124] focus-within:bg-white">
      <Icon name="search" size={18} className="shrink-0 text-[#8B8D94]" />

      {chips.map((chip) => (
        <InputChip key={chip.key} kind={chip.kind} name={chip.name} onRemove={chip.onRemove} />
      ))}

      <input
        type="text"
        aria-label={label}
        value={value}
        // 조건을 이미 담았으면 안내 문구가 자리를 더 차지하지 않게 비운다.
        placeholder={chips.length > 0 ? "" : placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && value === "") onBackspaceEmpty?.();
        }}
        className="h-8 min-w-24 flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-[#868B94]"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          className="flex size-8 shrink-0 items-center justify-center"
        >
          <Icon name="x" size={16} className="text-[#8B8D94]" />
        </button>
      ) : null}
    </div>
  );
}

/** 입력 안에 담긴 조건 하나. 포함과 제외를 색과 글자로 함께 알린다. */
function InputChip({ kind, name, onRemove }: Omit<SearchChip, "key">) {
  const label = kind === "include" ? "포함" : "제외";
  const style = kind === "include" ? "bg-[#212124] text-white" : "bg-[#D93B5C] text-white";

  return (
    <span className={`flex h-7 shrink-0 items-center gap-1 rounded-[14px] pr-1 pl-2.5 ${style}`}>
      <span className="text-[12px] font-semibold">
        {name} {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${name} ${label} 조건 삭제`}
        className="flex size-5 items-center justify-center rounded-full"
      >
        <Icon name="x" size={12} strokeWidth={2} />
      </button>
    </span>
  );
}
