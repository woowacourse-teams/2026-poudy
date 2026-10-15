import type { UserProfileRequest } from "@poudy/api/api.zod";

export type Gender = NonNullable<UserProfileRequest["gender"]>;
export type AgeRange = NonNullable<UserProfileRequest["ageRange"]>;
export type SkinType = NonNullable<UserProfileRequest["skinType"]>;

export type ProfileOption<T extends string> = { readonly value: T; readonly label: string };

export type SkinTypeOption = ProfileOption<SkinType> & { readonly icon: string; readonly description: string };

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

/** 고르지 않은 값이나 모르는 값이면 undefined 다. */
export const profileLabel = <T extends string>(
  options: readonly ProfileOption<T>[],
  value: T | null,
): string | undefined => options.find((option) => option.value === value)?.label;
