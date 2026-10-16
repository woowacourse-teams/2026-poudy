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
    "press-scale fb-dim flex h-13 items-center justify-center gap-2 rounded-xl bg-kakao-bg text-16 leading-snug font-semibold text-kakao-fg",
  google:
    "press-scale fb-surface flex h-13 items-center justify-center gap-2 rounded-xl border border-google-border bg-background text-16 leading-snug font-semibold text-google-fg",
};

const ROUND: Readonly<Record<SocialProvider, string>> = {
  kakao: "press-scale fb-dim flex size-14 items-center justify-center rounded-full bg-kakao-bg",
  google:
    "press-scale fb-surface flex size-14 items-center justify-center rounded-full border border-google-border bg-background",
};

function ProviderSymbol({ provider, size }: { readonly provider: SocialProvider; readonly size: 18 | 24 }) {
  if (provider === "kakao") {
    return (
      <span className="flex text-kakao-symbol">
        <KakaoIcon size={size} />
      </span>
    );
  }
  return <GoogleIcon size={size} />;
}

/** 마지막에 로그인한 방법 위에 띄우는 말풍선(S37b). 링크 안에 두어 '카카오로 시작하기 최근 로그인'으로 읽힌다. */
function RecentLoginBubble() {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-(--z-popover) flex -translate-x-1/2 translate-y-1 flex-col items-center">
      <span className="rounded-full bg-action px-3 py-1 text-label font-bold whitespace-nowrap text-action-text">
        최근 로그인
      </span>
      <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" focusable="false" className="fill-action">
        <path d="M0 0h10L5 6z" />
      </svg>
    </span>
  );
}

const PROVIDERS: readonly SocialProvider[] = ["kakao", "google"];

const subscribe = () => () => {};
const serverLastLogin = () => null;

/**
 * 소셜 로그인 버튼 묶음. 처음에는 이름이 적힌 넓은 버튼(S37)이고, 이 기기에서 로그인한 적이 있으면
 * 동그란 아이콘 버튼으로 줄이고 마지막에 쓴 방법 위에 '최근 로그인'을 띄운다(S37b).
 */
export function SocialLoginButtons() {
  const lastLogin = useSyncExternalStore(subscribe, readLastLogin, serverLastLogin);

  if (!lastLogin) {
    return (
      <div className="flex flex-col gap-2">
        {PROVIDERS.map((provider) => (
          <SocialLoginLink key={provider} provider={provider} className={WIDE[provider]}>
            <ProviderSymbol provider={provider} size={18} />
            {LABELS[provider]}
          </SocialLoginLink>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 pb-1">
      {PROVIDERS.map((provider) => (
        <SocialLoginLink key={provider} provider={provider} className={ROUND[provider]}>
          <ProviderSymbol provider={provider} size={24} />
          <span className="sr-only">{LABELS[provider]}</span>
          {provider === lastLogin ? (
            <>
              {" "}
              <RecentLoginBubble />
            </>
          ) : null}
        </SocialLoginLink>
      ))}
    </div>
  );
}
