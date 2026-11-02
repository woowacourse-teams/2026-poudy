"use client";

import { TextField } from "@poudy/design-system/text-field";

import { nicknameError } from "@/lib/domain/nickname";

export function NicknameField({
  value,
  onChange,
  placeholder,
  optional = false,
  disabled,
  error,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly error?: string;
}) {
  return (
    <TextField
      label="닉네임"
      value={value}
      onChange={onChange}
      optional={optional}
      showOptionalLabel={false}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="nickname"
      autoCapitalize="none"
      spellCheck={false}
      hint={
        optional
          ? "입력하지 않으면 기본 닉네임을 사용해요. 한글·영문·숫자·공백 2~20자"
          : "한글·영문·숫자와 단어 사이 한 칸 공백 · 2~20자"
      }
      rule={{ validate: (current) => nicknameError(current, optional) }}
      serverError={error}
    />
  );
}
