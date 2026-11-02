import { UserProfileRequest } from "@poudy/api/api.zod";

import { constraintOf } from "@/lib/api/constraint";

const schema = UserProfileRequest.shape.nickname.unwrap().unwrap();
export const NICKNAME_MIN_LENGTH = constraintOf(schema.minLength, "닉네임 최소 길이");
export const NICKNAME_MAX_LENGTH = constraintOf(schema.maxLength, "닉네임 최대 길이");

export const nicknameError = (value: string, optional = false): string | undefined => {
  if (!value && optional) return undefined;
  if (value.length < NICKNAME_MIN_LENGTH) return "닉네임은 2자 이상 입력해 주세요.";
  if (value.length > NICKNAME_MAX_LENGTH) return "닉네임은 공백을 포함해 20자 이하로 입력해 주세요.";
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+(?: [가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+)*$/.test(value)) {
    return "한글, 영문, 숫자와 단어 사이 한 칸 공백만 사용할 수 있어요.";
  }
  return undefined;
};
