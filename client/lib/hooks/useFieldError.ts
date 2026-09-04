"use client";

import { useDebouncedValue } from "./useDebouncedValue";

/**
 * 입력이 멈춘 뒤에 잘못을 알린다. 글자마다 알리면 열 자를 채우는 동안
 * 계속 붉은 글씨가 따라다녀 재촉받는 느낌을 준다.
 */
export const useFieldError = (value: string, validate: (value: string) => string | undefined): string | undefined =>
  validate(useDebouncedValue(value));
