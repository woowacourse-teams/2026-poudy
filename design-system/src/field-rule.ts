"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 입력 한 칸의 검사 규칙. 무엇이 오류인지는 client 의 도메인이 정하고, 오류를 언제 보여 줄지는 입력 부품이 정한다.
 *
 * 기본은 명세 FEEDBACK F06 의 규칙이다. 칸을 벗어날 때(blur) 처음 검사하고, 한 번 오류가 난 칸은 입력할 때마다 다시
 * 검사한다. 칸에 따라 입력이 멈춘 뒤 검사하도록 바꿀 수 있다. 어느 쪽이든 손대지 않은 칸에는 오류를 띄우지 않고,
 * 고치면 기다리지 않고 바로 지운다.
 *
 * 제출 버튼을 켤지 정할 때도 화면이 같은 `validate` 를 부른다. 그러면 버튼 판단과 칸의 오류가 어긋나지 않는다.
 */
export type FieldRule = {
  /** 지금 값의 오류 문구. 문제가 없으면 undefined */
  readonly validate: (value: string) => string | undefined;
} & (
  | {
      /** 칸을 벗어날 때 처음 검사한다. 기본값 */
      readonly validateOn?: "blur";
    }
  | {
      /** 입력이 멈춘 뒤 검사한다 */
      readonly validateOn: "change";
      /** 입력이 멈춘 뒤 기다리는 시간(ms). 기본값 300 */
      readonly debounceMs?: number;
    }
);

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * 규칙에 따라 지금 보여 줄 오류를 정한다. 서버가 돌려준 오류는 시점 규칙 없이 바로 보여 준다.
 *
 * 한 번 오류가 난 칸은 그 뒤로 값마다 다시 검사한다. 검사했을 때 문제가 없던 칸은 다음 검사 때까지 조용히 둔다.
 */
export function useFieldError(value: string, rule: FieldRule | undefined, serverError: string | undefined) {
  const [failed, setFailed] = useState(false);
  // 사용자가 값을 한 번이라도 바꿨는지. 손대지 않은 칸은 칸을 지나가기만 해도 검사하지 않는다.
  const touched = useRef(false);
  const debounceMs = rule?.validateOn === "change" ? (rule.debounceMs ?? DEFAULT_DEBOUNCE_MS) : undefined;

  const check = (current: string) => {
    if (rule && touched.current && rule.validate(current) !== undefined) setFailed(true);
  };

  useEffect(() => {
    if (debounceMs === undefined || failed || !touched.current) return;
    const timer = setTimeout(() => {
      if (rule?.validate(value) !== undefined) setFailed(true);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs, failed, rule]);

  return {
    error: serverError ?? (failed ? rule?.validate(value) : undefined),
    markTouched: () => {
      touched.current = true;
    },
    onBlur: () => check(value),
  };
}
