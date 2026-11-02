import { UserProfileRequest } from "@poudy/api/api.zod";

import { constraintOf } from "@/lib/api/constraint";

const schema = UserProfileRequest.shape.nickname.unwrap().unwrap();
export const NICKNAME_MIN_LENGTH = constraintOf(schema.minLength, "닉네임 최소 길이");
export const NICKNAME_MAX_LENGTH = constraintOf(schema.maxLength, "닉네임 최대 길이");

export const nicknameError = (value: string): string | undefined => {
  if (/\s/.test(value)) return "띄어쓰기는 쓸 수 없어요";
  if (/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/.test(value)) return "특수문자는 쓸 수 없어요";
  if (value.length < NICKNAME_MIN_LENGTH || value.length > NICKNAME_MAX_LENGTH) {
    return `${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해 주세요`;
  }
  return undefined;
};
