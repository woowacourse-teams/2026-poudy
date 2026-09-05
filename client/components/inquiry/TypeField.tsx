"use client";

import type { InquiryChoice } from "./inquiry-type";
import { INQUIRY_CHOICES, INQUIRY_COPY } from "./inquiry-type";

/**
 * 문의 유형을 고른다. 고르기 전에는 아래 입력 항목이 나타나지 않는다.
 * DATA_CORRECTION 은 대상 제품이 정해져야 뜻이 서므로 이 목록에 없다.
 */
export function TypeField({
  selected,
  onSelect,
  disabled = false,
}: {
  readonly selected?: InquiryChoice;
  readonly onSelect: (choice: InquiryChoice) => void;
  readonly disabled?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      {/* 버튼 묶음이라 label 이 아니라 그룹 이름으로 전한다. */}
      <p className="flex items-center gap-0.5 text-[13px] font-semibold text-text-primary" id="inquiry-type-label">
        문의 유형
        <span aria-hidden="true" className="text-brand">
          *
        </span>
        <span className="sr-only">필수</span>
      </p>

      <div role="radiogroup" aria-labelledby="inquiry-type-label" className="grid grid-cols-2 gap-2">
        {INQUIRY_CHOICES.map((choice) => {
          const active = choice === selected;

          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(choice)}
              /*
               * 좁은 화면에서는 긴 문구가 두 줄로 접힌다. 접히더라도 한 줄짜리와
               * 높이가 같아 보이도록 최소 높이를 두고 가운데 맞춘다.
               */
              className={`flex min-h-10 items-center justify-center rounded-full border px-2.5 py-2 text-center text-[12px] leading-tight transition-colors ${
                active
                  ? "border-action bg-action font-bold text-action-text"
                  : "border-border bg-background text-text-primary"
              } ${disabled ? "opacity-60" : ""}`}
            >
              {INQUIRY_COPY[choice].label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
