import { MemberResponse } from "@poudy/api/api.zod";

import { apiGet, publicApiUrl } from "./client";

export type SocialProvider = "kakao" | "google";

/** 소셜 로그인은 fetch 가 아니라 이 주소로 페이지째 이동해 시작한다. */
export const socialLoginUrl = (provider: SocialProvider): string =>
  publicApiUrl(`/api/oauth2/authorization/${provider}`);

export const findMe = (): Promise<MemberResponse> => apiGet("/api/members/me", MemberResponse, { withSession: true });
