"use client";

import { GoogleIcon, KakaoIcon } from "./ProviderIcon";
import { SocialLoginLink } from "./SocialLoginLink";

import type { SocialProvider } from "@/lib/api/member";

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

const PROVIDERS: readonly SocialProvider[] = ["kakao", "google"];

/** 소셜 로그인 버튼 묶음(S37). 늘 이름이 적힌 넓은 버튼으로 보인다. */
export function SocialLoginButtons() {
  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((provider) => (
        <SocialLoginLink key={provider} provider={provider} className={WIDE[provider]}>
          <ProviderSymbol provider={provider} />
          {LABELS[provider]}
        </SocialLoginLink>
      ))}
    </div>
  );
}
