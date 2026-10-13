const PROVIDER_NAMES: Readonly<Record<string, string>> = { KAKAO: "카카오", GOOGLE: "Google" };

/** 서버의 소셜 로그인 제공자 코드를 화면 이름으로 바꾼다. 모르는 코드면 undefined 다. */
export const providerName = (provider: string | null): string | undefined => PROVIDER_NAMES[provider ?? ""];
