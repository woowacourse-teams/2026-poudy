/**
 * 도메인 계층에서는 삼항 연산자를 쓰지 않는다(no-ternary).
 * 조건에 따라 값을 고르는 일을 목록 다루기로 바꿔 표현한다.
 */

/** 조건이 참일 때만 값을 남긴다. */
export const keepIf = <T>(condition: boolean, value: T): readonly T[] => [condition].filter(Boolean).map(() => value);

/** 첫 값이 있으면 그것을, 없으면 기본값을 준다. */
export const firstOf = <T>(candidates: readonly T[], fallback: T): T => candidates[0] ?? fallback;

/** 조건이 참이면 앞의 값을, 아니면 뒤의 값을 준다. */
export const pick = <T>(condition: boolean, whenTrue: T, whenFalse: T): T =>
  firstOf(keepIf(condition, whenTrue), whenFalse);
