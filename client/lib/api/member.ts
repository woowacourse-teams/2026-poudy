import {
  AppLoginResponse,
  RegisteredAccountResponse,
  ProfileImageUploadResponse,
  UserResponse,
  WithdrawnAccountResponse,
  type UserProfileRequest,
} from "@poudy/api/api.zod";

import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPostFor, apiPostForm, publicApiUrl } from "./client";

import { analyticsIdentityRevision, identifyAnalyticsMember, resetAnalyticsIdentity } from "@/lib/analytics/identity";
import { clearShelfJourney } from "@/lib/analytics/shelf-journey";
import { clearLastMyFilterCount } from "@/lib/storage/last-my-filter";

export type SocialProvider = "kakao" | "google";

/** 앱 WebView 안에서 시작한 로그인이라 서버가 앱 세션으로 만들게 하는 값. */
export const APP_LOGIN_CHANNEL = "app";

/** 소셜 로그인은 fetch 가 아니라 이 주소로 페이지째 이동해 시작한다. */
export const socialLoginUrl = (
  provider: SocialProvider,
  returnOrigin?: string,
  channel?: typeof APP_LOGIN_CHANNEL,
): string => {
  const url = publicApiUrl(`/api/oauth2/authorization/${provider}`);
  const params = new URLSearchParams();
  if (returnOrigin) params.set("returnOrigin", returnOrigin);
  if (channel) params.set("channel", channel);
  if (params.size === 0) return url;
  return `${url}?${params}`;
};

/** 앱이 네이티브 SDK 로 받은 제공자 토큰을 세션으로 바꾼다. 카카오는 접근 토큰, 구글은 ID 토큰이다. */
export const appLogin = (provider: SocialProvider, token: string): Promise<AppLoginResponse> =>
  apiPostFor(`/api/auth/${provider}/app-login`, AppLoginResponse, { token });

export const findMe = ({ reportErrors = true }: { readonly reportErrors?: boolean } = {}): Promise<UserResponse> => {
  const revision = analyticsIdentityRevision();
  return apiGet("/api/users/me", UserResponse, { withSession: true, reportErrors }).then(
    (member) => {
      identifyAnalyticsMember(member.id, revision);
      return member;
    },
    (error: unknown) => {
      if (isSignedOut(error)) resetAnalyticsIdentity("signed_out", revision);
      else if (isAdminSession(error)) resetAnalyticsIdentity("admin", revision);
      throw error;
    },
  );
};

export const updateMyProfile = (profile: UserProfileRequest): Promise<UserResponse> =>
  apiPatch("/api/users/me/profile", UserResponse, profile);

export const uploadProfileImage = (file: File): Promise<ProfileImageUploadResponse> => {
  const form = new FormData();
  form.append("image", file);
  return apiPostForm("/api/users/me/profile-image", ProfileImageUploadResponse, form);
};

export const logout = (): Promise<void> =>
  apiPost("/api/users/logout", undefined, { withSession: true }).then(() => {
    resetAnalyticsIdentity();
    clearShelfJourney();
    clearLastMyFilterCount();
  });

export const withdraw = (): Promise<void> =>
  apiDelete("/api/users/me").then(() => {
    resetAnalyticsIdentity();
    clearShelfJourney();
    clearLastMyFilterCount();
  });

/** 처음 소셜 로그인한 사람만 보낼 수 있다. 가입하면 같은 세션으로 바로 로그인된다. */
export const signUp = (): Promise<void> => apiPost("/api/auth/signup", undefined, { withSession: true });

/** 탈퇴한 계정으로 방금 로그인한 사람만 읽을 수 있다. 복구를 요청하면 더 읽을 수 없다. */
export const findWithdrawnAccount = (): Promise<WithdrawnAccountResponse> =>
  apiGet("/api/auth/withdrawn", WithdrawnAccountResponse, { withSession: true });

/** 이메일 중복으로 방금 로그인에 실패한 사람만 읽을 수 있다. 그 이메일과 먼저 가입한 제공자를 준다. */
export const findRegisteredAccount = (): Promise<RegisteredAccountResponse> =>
  apiGet("/api/auth/registered-account", RegisteredAccountResponse, { withSession: true });

/** 탈퇴한 계정으로 방금 로그인한 사람만 보낼 수 있다. 복구 여부는 관리자가 정한다. */
export const requestRestore = (): Promise<void> =>
  apiPost("/api/auth/withdrawn/restore", undefined, { withSession: true });

/**
 * 로그인하지 않았거나, 다른 기기에서 탈퇴해 세션의 회원이 더 없는 경우다. 둘 다 다시 로그인해야 한다.
 */
export const isSignedOut = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.code === "MEMBER_NOT_FOUND");

/**
 * 관리자로 로그인한 세션이 회원 API를 불렀다. 출처 확인 실패(FORBIDDEN_ORIGIN)도 403 이라 코드로 가린다.
 */
export const isAdminSession = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403 && error.code === "FORBIDDEN";
