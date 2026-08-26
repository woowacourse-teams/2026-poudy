"use client";

import { Icon } from "./icons/Icon";

type FilterChipProps = {
  readonly label: string;
  /** 조건이 걸려 있는지. 열림 여부가 아니라 값이 선택됐는지를 나타낸다. */
  readonly selected?: boolean;
  /** 걸린 조건 수. 0 이면 숫자를 그리지 않는다. */
  readonly count?: number;
  readonly onClick?: () => void;
};

/** 디자인의 `Outline Strong` 칩. 눌러서 조건 바텀시트를 연다. */
export function FilterChip({ label, selected = false, count = 0, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      /*
       * 고르면 흰 배경이 검게 통째로 뒤집힌다. 그 큰 변화를 즉시 바꾸면 시선이 따라가지
       * 못하므로 색만 사이를 이어 준다.
       */
      className={[
        "filter-chip inline-flex h-8 shrink-0 items-center gap-1 rounded-2xl border px-3 text-[13px] leading-none font-medium",
        "motion-reduce:transition-none",
        selected ? "border-[#212124] bg-[#212124] text-white" : "border-[#D1D3D8] bg-white text-[#212124]",
      ].join(" ")}
    >
      {label}
      {count > 0 ? (
        <>
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">{count}개 선택됨</span>
        </>
      ) : null}
      {/*
        svg 는 기본이 inline 이라 글자의 밑줄에 앉는다. block 으로 두어 flex 가 직접
        가운데를 잡게 한다.

        그렇게 해도 상자만 가운데일 뿐 눈에는 위로 떠 보인다. `∨` 는 위가 넓고
        아래로 갈수록 좁아져 무게가 위에 쏠리기 때문이다. 한 픽셀 내려 눈에 맞춘다.
      */}
      <Icon name="chevron-down" size={13} className={`mt-px block ${selected ? "text-white" : "text-[#4D5159]"}`} />
    </button>
  );
}
