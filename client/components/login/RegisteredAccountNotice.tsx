"use client";

import type { OAuthProvider, RegisteredAccountResponse } from "@poudy/api/api.zod";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { useEffect, useState } from "react";

import { AccountActionArea, ActionTextLink } from "./AccountActionArea";
import { GoogleIcon, KakaoIcon, ProviderBadge } from "./ProviderIcon";
import { SocialLoginLink } from "./SocialLoginLink";
import { useSubScreenBack } from "./useSubScreenBack";

import { findRegisteredAccount, type SocialProvider } from "@/lib/api/member";
import { providerName } from "@/lib/domain/social-provider";

const LOGIN_BUTTON =
  "press-scale flex h-14 items-center justify-center gap-2 rounded-xl text-16 leading-snug font-bold";

/** 브랜드 색 로그인 버튼(카카오 노랑, Google 흰 바탕 + 테두리). 명세의 '따로 관리하는 색'이다. */
const LOGIN_LINKS: Readonly<Record<OAuthProvider, { readonly provider: SocialProvider; readonly className: string }>> =
  {
    KAKAO: { provider: "kakao", className: `${LOGIN_BUTTON} fb-dim bg-kakao-bg text-kakao-fg` },
    GOOGLE: {
      provider: "google",
      className: `${LOGIN_BUTTON} fb-surface border border-google-border bg-background text-google-fg`,
    },
  };

function LoginIcon({ provider }: { readonly provider: OAuthProvider }) {
  if (provider === "KAKAO") return <KakaoIcon />;
  return <GoogleIcon />;
}

type Props = {
  readonly provider: OAuthProvider;
};

/**
 * 다른 방법으로 가입한 이메일(S55h · S55i). 이메일 중복으로 로그인에 실패했을 때, 그 이메일이 어느 방법으로
 * 가입되어 있는지 알려 주고 그 방법으로 바로 로그인하게 한다.
 */
export function RegisteredAccountNotice({ provider }: Props) {
  const [account, setAccount] = useState<RegisteredAccountResponse | null>(null);
  const back = useSubScreenBack();

  useEffect(() => {
    findRegisteredAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const registered = account?.provider ?? provider;
  const name = providerName(registered);
  const link = LOGIN_LINKS[registered];

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="로그인" titleAs="p" back={back} />
      <ScreenBody>
        <main className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-screen font-bold text-text-primary">{name}로 가입한 이메일이에요</h1>
            <p className="text-body text-text-secondary">
              이 이메일은 {name} 로그인으로 가입되어 있어요. 이메일 하나에는 로그인 방법 하나만 쓸 수 있어요.
            </p>
          </div>

          {account ? (
            <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
              <ProviderBadge provider={account.provider} size="xlarge" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-title font-semibold break-all text-text-primary">{account.email}</span>
                <span className="text-body-sm leading-snug text-text-secondary">{name}로 가입</span>
              </span>
            </div>
          ) : null}
        </main>
      </ScreenBody>

      <AccountActionArea>
        <SocialLoginLink provider={link.provider} className={link.className}>
          <LoginIcon provider={registered} />
          {name}로 로그인
        </SocialLoginLink>
        <ActionTextLink href="/login">다른 방법으로 로그인</ActionTextLink>
      </AccountActionArea>
    </Screen>
  );
}
