"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { socialLoginUrl, type SocialProvider } from "@/lib/api/member";
import { readLastLogin } from "@/lib/storage/last-login";

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

const serverLastLogin = () => null;

function RecentLoginBadge() {
  return (
    <span className="pointer-events-none absolute right-6 bottom-full z-10 mb-1 rounded-full bg-[#212124] px-2.5 py-1 text-[11px] leading-none font-bold text-white">
      최근 로그인
      <span
        aria-hidden="true"
        className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#212124]"
      />
    </span>
  );
}

export function SocialLoginLink({ provider, className, children }: Props) {
  const returnOrigin = useSyncExternalStore(subscribe, previewOrigin, serverOrigin);
  const lastLogin = useSyncExternalStore(subscribe, readLastLogin, serverLastLogin);

  return (
    <a href={socialLoginUrl(provider, returnOrigin)} className={`relative ${className}`}>
      {children}
      {lastLogin === provider && <RecentLoginBadge />}
    </a>
  );
}
