"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { socialLoginUrl, type SocialProvider } from "@/lib/api/member";

type Props = {
  readonly provider: SocialProvider;
  readonly className: string;
  readonly children: ReactNode;
};

// 오리진은 페이지가 열린 동안 바뀌지 않는다. SSR에서는 기존 로그인 링크를 사용한다.
const subscribe = () => () => {};
const serverOrigin = () => undefined;
const previewOrigin = () =>
  window.location.protocol === "https:" && window.location.hostname.endsWith(".preview.poudy.site")
    ? window.location.origin
    : undefined;

export function SocialLoginLink({ provider, className, children }: Props) {
  const returnOrigin = useSyncExternalStore(subscribe, previewOrigin, serverOrigin);

  return (
    <a href={socialLoginUrl(provider, returnOrigin)} className={className}>
      {children}
    </a>
  );
}
