"use client";

import { FieldLabel } from "./FieldLabel";
import { FieldMessage } from "./FieldMessage";

import { CONTENT_MAX_LENGTH } from "@/lib/api/feedback";
import { contentError } from "@/lib/domain/inquiry-validation";
import { useFieldError } from "@/lib/hooks/useFieldError";

const FIELD_ID = "inquiry-content";
const MESSAGE_ID = "inquiry-content-message";

export function ContentField({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
}: {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) {
  const error = useFieldError(value, contentError);

  return (
    <section className="flex flex-col gap-2">
      <FieldLabel htmlFor={FIELD_ID} required>
        {label}
      </FieldLabel>

      <div className="flex flex-col rounded-xl bg-surface-subtle px-3 pt-3 pb-1.5">
        <textarea
          id={FIELD_ID}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={CONTENT_MAX_LENGTH}
          disabled={disabled}
          rows={6}
          aria-invalid={error ? true : undefined}
          aria-describedby={MESSAGE_ID}
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text-primary outline-none placeholder:text-text-secondary disabled:opacity-60"
        />

        {/* 남은 분량을 눈으로 볼 수 있어야 2,000 자에 걸려 놀라지 않는다. */}
        <span aria-hidden="true" className="self-end text-[11px] text-text-secondary">
          {value.length.toLocaleString("ko-KR")} / {CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}
        </span>
      </div>

      {/*
        오류 문구 자리를 흐름 밖에 둔다. 흐름 안에 두면 비어 있을 때도 한 줄을
        차지해 아래 항목과 사이가 유독 벌어진다. 자리는 절반만 흐름에 남기고
        나머지는 아래 여백에 겹쳐, 오류가 없을 때 빈 줄이 도드라지지 않으면서
        오류가 떠도 아래 항목에 붙지 않는다.
      */}
      <div className="relative h-1">
        <div className="absolute inset-x-0 top-0.5">
          <FieldMessage id={MESSAGE_ID} error={error} />
        </div>
      </div>
    </section>
  );
}
