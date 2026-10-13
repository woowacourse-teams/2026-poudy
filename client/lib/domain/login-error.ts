import { providerName as nameOf } from "./social-provider";

/**
 * 소셜 로그인을 마친 서버가 /login/callback 에 붙여 보낸 오류를 화면 문구로 바꾼다.
 * 이메일 중복이면 provider 에 먼저 가입한 제공자가 온다.
 */
export const loginErrorMessage = (code: string, provider: string | null): string => {
  const providerName = nameOf(provider);

  if (code === "MEMBER_EMAIL_ALREADY_REGISTERED" && providerName) {
    return `이미 ${providerName}로 가입한 이메일이에요. ${providerName}로 로그인해 주세요.`;
  }
  if (code === "MEMBER_EMAIL_ALREADY_REGISTERED") {
    return "다른 로그인 방식으로 이미 가입한 이메일이에요.";
  }
  if (code === "OAUTH_EMAIL_NOT_VERIFIED") {
    return "인증된 이메일이 있는 계정으로만 가입할 수 있어요. 계정의 이메일 인증 상태를 확인해 주세요.";
  }
  return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
};
