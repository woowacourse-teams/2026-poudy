"use client";

import { TextField } from "@poudy/design-system/text-field";

import { nicknameError } from "@/lib/domain/nickname";

/** 바꾼 닉네임은 입력이 멈춘 뒤 중복을 확인하고, 사용할 수 있어야 저장한다. */
export type NicknameAvailability = "unchanged" | "checking" | "available" | "unavailable";

const RULE_HINT = "띄어쓰기와 특수문자는 쓸 수 없어요";

const hintOf = (availability: NicknameAvailability): string => {
  if (availability === "checking") return "중복을 확인하고 있어요.";
  if (availability === "available") return "사용할 수 있는 닉네임이에요.";
  return RULE_HINT;
};

export function NicknameField({
  value,
  onChange,
  availability,
  disabled,
  error,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly availability: NicknameAvailability;
  readonly disabled?: boolean;
  readonly error?: string;
}) {
  return (
    <TextField
      label="닉네임"
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete="nickname"
      autoCapitalize="none"
      spellCheck={false}
      hint={hintOf(availability)}
      rule={{ validate: nicknameError, validateOn: "change" }}
      serverError={error}
    />
  );
}
