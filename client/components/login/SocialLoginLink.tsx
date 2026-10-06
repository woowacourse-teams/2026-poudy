"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useRef, useState, useSyncExternalStore } from "react";

import { APP_LOGIN_CHANNEL, socialLoginUrl, type SocialProvider } from "@/lib/api/member";
import { canAppLogin, signInWithApp } from "@/lib/interaction/app-login";

type Props = {
  readonly provider: SocialProvider;
  readonly className: string;
  readonly children: ReactNode;
};

// 연달아 눌러 앱 로그인이 두 번 시작되지 않게 한다. 결과를 기다리는 중이라도 이보다 늦게 누르면 새로 시작한다.
const REPEAT_TAP_MS = 1000;

// 오리진은 페이지가 열린 동안 바뀌지 않는다. SSR에서는 기존 로그인 링크를 사용한다.
const subscribe = () => () => {};
const serverOrigin = () => undefined;
const previewOrigin = () =>
  window.location.protocol === "https:" && window.location.hostname.endsWith(".preview.poudy.site")
    ? window.location.origin
    : undefined;

export function SocialLoginLink({ provider, className, children }: Props) {
  const lastRequestedAtRef = useRef(0);
  const router = useRouter();
  const returnOrigin = useSyncExternalStore(subscribe, previewOrigin, serverOrigin);
  const [pending, setPending] = useState(false);

  // 앱 안에서는 페이지를 옮기지 않고 앱의 네이티브 로그인에 맡긴다. 구글은 WebView 안 OAuth 를 막는다.
  const signInInApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canAppLogin(provider)) return;

    event.preventDefault();
    const requestedAt = Date.now();
    if (requestedAt - lastRequestedAtRef.current < REPEAT_TAP_MS) return;

    lastRequestedAtRef.current = requestedAt;
    setPending(true);
    void signInWithApp(provider).then((result) => {
      if (result.kind === "callback") {
        router.replace(result.url);
        return;
      }
      if (result.kind === "webLogin") {
        window.location.assign(socialLoginUrl(provider, returnOrigin, APP_LOGIN_CHANNEL));
        return;
      }
      if (lastRequestedAtRef.current !== requestedAt) return;

      lastRequestedAtRef.current = 0;
      setPending(false);
    });
  };

  return (
    <a href={socialLoginUrl(provider, returnOrigin)} onClick={signInInApp} aria-busy={pending} className={className}>
      {children}
    </a>
  );
}
