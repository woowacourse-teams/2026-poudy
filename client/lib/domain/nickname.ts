import { ErrorCode, UserProfileRequest } from "@poudy/api/api.zod";

import { constraintOf } from "@/lib/api/constraint";

const schema = UserProfileRequest.shape.nickname.unwrap().unwrap();
export const NICKNAME_MIN_LENGTH = constraintOf(schema.minLength, "닉네임 최소 길이");
export const NICKNAME_MAX_LENGTH = constraintOf(schema.maxLength, "닉네임 최대 길이");

const LENGTH_ERROR = `${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해 주세요`;
export const NICKNAME_TAKEN = "이미 사용 중인 닉네임이에요.";
/** 닉네임 칸의 기본 안내. 서버가 형식 오류만 알리고 이유를 가리지 않을 때도 쓴다. */
export const NICKNAME_RULE = "띄어쓰기와 특수문자는 쓸 수 없어요";

export const nicknameError = (value: string): string | undefined => {
  if (/\s/.test(value)) return "띄어쓰기는 쓸 수 없어요";
  if (/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/.test(value)) return "특수문자는 쓸 수 없어요";
  if (value.length < NICKNAME_MIN_LENGTH || value.length > NICKNAME_MAX_LENGTH) return LENGTH_ERROR;
  return undefined;
};

/**
 * 서버가 닉네임을 거절한 이유(코드)를 화면 문구로 바꾼다. 서버 설명(detail)은 '-습니다'체라
 * 화면에 쓰지 않는다(CONTENT W01). 형식·길이 오류는 입력 규칙과 같은 문구를 쓰고, 예약어는
 * 클라이언트가 미리 검사하지 않으므로 서버 코드로만 알 수 있다. 모르는 코드는 일반 문구로 둔다.
 */
export const nicknameServerError = (code: string, value: string): string => {
  switch (code) {
    case ErrorCode.enum.RESERVED_NICKNAME:
      return "관리자나 운영자로 보일 수 있는 닉네임은 쓸 수 없어요";
    case ErrorCode.enum.NICKNAME_ALREADY_EXISTS:
      return NICKNAME_TAKEN;
    case ErrorCode.enum.INVALID_NICKNAME_FORMAT:
      return nicknameError(value) ?? NICKNAME_RULE;
    case ErrorCode.enum.INVALID_NICKNAME:
    case ErrorCode.enum.NICKNAME_TOO_SHORT:
    case ErrorCode.enum.NICKNAME_TOO_LONG:
      return LENGTH_ERROR;
    default:
      return "다른 닉네임을 입력해 주세요";
  }
};
