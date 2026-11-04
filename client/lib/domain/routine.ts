/** 루틴 이름의 최대 글자 수. 서버와 같이 앞뒤 공백을 뺀 코드 포인트로 센다. */
export const ROUTINE_NAME_MAX_LENGTH = 25;

/** 루틴 메모의 최대 글자 수. */
export const ROUTINE_MEMO_MAX_LENGTH = 200;

/** 서버가 세는 기준(앞뒤 공백을 뺀 코드 포인트)으로 센 글자 수. 이모지도 한 글자다. */
export const routineTextLength = (value: string): number => Array.from(value.trim()).length;
