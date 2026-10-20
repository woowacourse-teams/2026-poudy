"use client";

import { useSyncExternalStore } from "react";

import { GoogleIcon, KakaoIcon } from "./ProviderIcon";
import { SocialLoginLink } from "./SocialLoginLink";

import type { SocialProvider } from "@/lib/api/member";
import { readLastLogin } from "@/lib/storage/last-login";

const LABELS: Readonly<Record<SocialProvider, string>> = {
  kakao: "카카오로 시작하기",
  google: "Google로 시작하기",
};

/** 브랜드 색 로그인 버튼(카카오 노랑, Google 흰 바탕 + 테두리). 명세의 '따로 관리하는 색'이다. */
const WIDE: Readonly<Record<SocialProvider, string>> = {
  kakao:
    "press-scale fb-dim relative flex h-12 items-center justify-center gap-2 rounded-xl bg-kakao-bg text-15 leading-snug font-semibold text-kakao-fg",
  google:
    "press-scale fb-surface relative flex h-12 items-center justify-center gap-2 rounded-xl border border-google-border bg-background text-15 leading-snug font-semibold text-google-fg",
};

function ProviderSymbol({ provider }: { readonly provider: SocialProvider }) {
  if (provider === "kakao") {
    return (
      <span className="flex text-kakao-symbol">
        <KakaoIcon size={18} />
      </span>
    );
  }
  return <GoogleIcon size={18} />;
}

/** 맨 위 버튼 위 가운데에 띄우는 말풍선(S37c). 화면에서만 보이고, 읽기는 버튼 이름에 덧붙인 글자가 맡는다. */
function RecentLoginBubble() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full left-1/2 flex -translate-x-1/2 translate-y-px flex-col items-center"
    >
      <span className="rounded-full bg-action px-3 py-1 text-label font-bold whitespace-nowrap text-action-text">
        최근 로그인
      </span>
      <svg width="10" height="6" viewBox="0 0 10 6" focusable="false" className="fill-action">
        <path d="M0 0h10L5 6z" />
      </svg>
    </span>
  );
}

const PROVIDERS: readonly SocialProvider[] = ["kakao", "google"];

/** 최근에 쓴 방법을 맨 위로 올리고, 나머지는 기본 순서(카카오 → Google)를 지킨다. */
const orderOf = (lastLogin: SocialProvider | null): readonly SocialProvider[] => {
  if (!lastLogin) return PROVIDERS;
  return [lastLogin, ...PROVIDERS.filter((provider) => provider !== lastLogin)];
};

const subscribe = () => () => {};
const serverLastLogin = () => null;

/**
 * 소셜 로그인 버튼 묶음(S37). 늘 이름이 적힌 넓은 버튼이다.
 * 이 기기에서 로그인한 적이 있으면 마지막에 쓴 방법을 맨 위로 올리고 그 위에 '최근 로그인'을 띄운다(S37c · S37c-2).
 */
export function SocialLoginButtons() {
  const lastLogin = useSyncExternalStore(subscribe, readLastLogin, serverLastLogin);

  return (
    <div className="flex flex-col gap-2">
      {orderOf(lastLogin).map((provider) => (
        <SocialLoginLink key={provider} provider={provider} className={WIDE[provider]}>
          <ProviderSymbol provider={provider} />
          {LABELS[provider]}
          {provider === lastLogin ? (
            <>
              <span className="sr-only">, 최근 로그인</span>
              <RecentLoginBubble />
            </>
          ) : null}
        </SocialLoginLink>
      ))}
    </div>
  );
}
