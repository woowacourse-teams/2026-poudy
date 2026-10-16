import type { UserProfileRequest, UserResponse } from "@poudy/api/api.zod";

import { keepIf, pick } from "./optional";

export type Gender = NonNullable<UserProfileRequest["gender"]>;
export type AgeRange = NonNullable<UserProfileRequest["ageRange"]>;
export type SkinType = NonNullable<UserProfileRequest["skinType"]>;
export const SENSITIVE = "SENSITIVE";
export type SkinChoice = SkinType | typeof SENSITIVE;

export type ProfileOption<T extends string> = { readonly value: T; readonly label: string };

export type SkinTypeOption = ProfileOption<SkinChoice> & { readonly icon: string; readonly description: string };

export const GENDERS: readonly ProfileOption<Gender>[] = [
  { value: "FEMALE", label: "여성" },
  { value: "MALE", label: "남성" },
];

export const AGE_RANGES: readonly ProfileOption<AgeRange>[] = [
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES", label: "50대" },
  { value: "SIXTIES_OR_OLDER", label: "60대 이상" },
];

export const SKIN_TYPES: readonly SkinTypeOption[] = [
  { value: "DRY", icon: "dry", label: "건성", description: "세안 후 자주 당겨요" },
  { value: "OILY", icon: "oily", label: "지성", description: "오후면 번들거려요" },
  { value: "SENSITIVE", icon: "sensitive", label: "민감성", description: "쉽게 붉어지고 따가워요" },
  { value: "COMBINATION", icon: "combination", label: "복합성", description: "T존만 번들거려요" },
];

export const skinChoiceOf = (profile: Pick<UserResponse, "skinType" | "sensitiveSkin">): SkinChoice | null =>
  pick<SkinChoice | null>(profile.sensitiveSkin === true, SENSITIVE, profile.skinType);

export const skinProfileOf = (choice: SkinChoice | null): Pick<UserProfileRequest, "skinType" | "sensitiveSkin"> => {
  if (choice === SENSITIVE) return { skinType: null, sensitiveSkin: true };
  return { skinType: choice, sensitiveSkin: null };
};

/** 고르지 않은 값이나 모르는 값이면 undefined 다. */
export const profileLabel = <T extends string>(
  options: readonly ProfileOption<T>[],
  value: T | null,
): string | undefined => options.find((option) => option.value === value)?.label;

/**
 * 마이페이지에서 피부 타입을 고를 때 쓰는 선택지(S55c). 피부 타입과 민감한지를 따로 묻는다.
 * 가입(S38)은 아직 민감성을 피부 타입 하나로 고르므로 `SKIN_TYPES` 를 그대로 둔다.
 */
export const SKIN_KINDS: readonly SkinKindOption[] = [
  { value: "DRY", icon: "dry", label: "건성", description: ["세안 후", "자주 당겨요"] },
  { value: "OILY", icon: "oily", label: "지성", description: ["오후면", "번들거려요"] },
  { value: "COMBINATION", icon: "combination", label: "복합성", description: ["T존만", "번들거려요"] },
];

export type SkinKindOption = ProfileOption<SkinType> & {
  readonly icon: string;
  /** 명세가 줄을 나눈 자리대로 둔다. 카드 폭이 좁아 저절로 나뉘면 '후'만 홀로 떨어진다. */
  readonly description: readonly [string, string];
};

export type Sensitivity = "SENSITIVE" | "NOT_SENSITIVE";

export const SENSITIVITIES: readonly ProfileOption<Sensitivity>[] = [
  { value: "SENSITIVE", label: "네, 민감해요" },
  { value: "NOT_SENSITIVE", label: "아니요" },
];

const SENSITIVITY_OF: Readonly<Record<Sensitivity, boolean>> = { SENSITIVE: true, NOT_SENSITIVE: false };

export const sensitivityOf = (sensitiveSkin: boolean | null): Sensitivity | null =>
  SENSITIVITIES.find((option) => SENSITIVITY_OF[option.value] === sensitiveSkin)?.value ?? null;

const SENSITIVE_SKIN_OF: Readonly<Record<Sensitivity | "UNANSWERED", boolean | null>> = {
  ...SENSITIVITY_OF,
  UNANSWERED: null,
};

export const sensitiveSkinOf = (sensitivity: Sensitivity | null): boolean | null =>
  SENSITIVE_SKIN_OF[sensitivity ?? "UNANSWERED"];

/**
 * 마이페이지 '피부 타입' 줄의 값. 민감하다고 답했으면 피부 타입 뒤에 '민감성'을 붙인다.
 * 둘 다 고르지 않았으면 undefined 다.
 */
export const skinSummaryOf = (profile: Pick<UserResponse, "skinType" | "sensitiveSkin">): string | undefined =>
  [profileLabel(SKIN_KINDS, profile.skinType), ...keepIf(profile.sensitiveSkin === true, "민감성")]
    .filter((label) => label !== undefined)
    .join(" · ") || undefined;
