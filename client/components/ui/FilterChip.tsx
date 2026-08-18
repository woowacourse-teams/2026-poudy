"use client";

type FilterChipProps = {
  readonly label: string;
  /** 조건이 걸려 있는지. 열림 여부가 아니라 값이 선택됐는지를 나타낸다. */
  readonly selected?: boolean;
  /** 선택한 개수. 있으면 라벨 뒤에 붙는다. */
  readonly count?: number;
  readonly onClick?: () => void;
};

/** 디자인의 `Outline Strong` 칩. 눌러서 조건 바텀시트를 연다. */
export function FilterChip({ label, selected = false, count, onClick }: FilterChipProps) {
  const text = count === undefined ? label : `${label} ${count}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-2xl border px-3 text-[13px] font-medium",
        selected ? "border-[#212124] bg-[#212124] text-white" : "border-[#D1D3D8] bg-white text-[#212124]",
      ].join(" ")}
    >
      {text}
      <ChevronDown className={selected ? "text-white" : "text-[#4D5159]"} />
    </button>
  );
}

function ChevronDown({ className }: { readonly className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 4.5 6 7.5 9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
