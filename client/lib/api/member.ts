import { MemberResponse, type MemberProfileRequest } from "@poudy/api/api.zod";

import { ApiError, apiDelete, apiGet, apiPatch, apiPost, publicApiUrl } from "./client";

export type SocialProvider = "kakao" | "google";

/** 소셜 로그인은 fetch 가 아니라 이 주소로 페이지째 이동해 시작한다. */
export const socialLoginUrl = (provider: SocialProvider): string =>
  publicApiUrl(`/api/oauth2/authorization/${provider}`);

export const findMe = (): Promise<MemberResponse> => apiGet("/api/members/me", MemberResponse, { withSession: true });

export const updateMyProfile = (profile: MemberProfileRequest): Promise<MemberResponse> =>
  apiPatch("/api/members/me/profile", MemberResponse, profile);

export const logout = (): Promise<void> => apiPost("/api/auth/logout", undefined, { withSession: true });

export const withdraw = (): Promise<void> => apiDelete("/api/members/me");

/** 탈퇴한 계정으로 방금 로그인한 사람만 보낼 수 있다. 복구 여부는 관리자가 정한다. */
export const requestRestore = (): Promise<void> =>
  apiPost("/api/auth/withdrawn-member/restore-request", undefined, { withSession: true });

/**
 * 로그인하지 않았거나, 다른 기기에서 탈퇴해 세션의 회원이 더 없는 경우다. 둘 다 다시 로그인해야 한다.
 */
export const isSignedOut = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.code === "MEMBER_NOT_FOUND");
