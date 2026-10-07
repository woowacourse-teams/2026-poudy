import type { MemberResponse } from "@poudy/api/api.zod";

import { createLocalStore } from "./local-store";

import type { SocialProvider } from "@/lib/api/member";

const isLastLogin = (value: unknown): value is SocialProvider | null =>
  value === "kakao" || value === "google" || value === null;

/** 로그인 화면에 어느 방식으로 마지막에 로그인했는지 표시하려고 이 기기에만 남긴다. */
const store = createLocalStore<SocialProvider | null>("poudy.last-login.v1", {
  version: 1,
  fallback: null,
  isValid: isLastLogin,
});

const PROVIDERS: Readonly<Record<MemberResponse["provider"], SocialProvider>> = {
  KAKAO: "kakao",
  GOOGLE: "google",
};

export const readLastLogin = (): SocialProvider | null => store.read();

export const rememberLastLogin = (provider: MemberResponse["provider"]): void => store.write(PROVIDERS[provider]);
