"use client";

import type { OAuthProvider, RegisteredAccountResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GoogleIcon, KakaoIcon, ProviderBadge } from "./ProviderIcon";
import { SocialLoginLink } from "./SocialLoginLink";

import { TopBar } from "@/components/ui/TopBar";
import { findRegisteredAccount, type SocialProvider } from "@/lib/api/member";
import { providerName } from "@/lib/domain/social-provider";

const LOGIN_LINKS: Readonly<Record<OAuthProvider, { readonly provider: SocialProvider; readonly className: string }>> =
  {
    KAKAO: { provider: "kakao", className: "bg-[#fee500] text-[#191919]" },
    GOOGLE: { provider: "google", className: "border border-[#8b8d8b] bg-background" },
  };

function LoginIcon({ provider }: { readonly provider: OAuthProvider }) {
  if (provider === "KAKAO") return <KakaoIcon />;
  return <GoogleIcon />;
}

type Props = {
  readonly provider: OAuthProvider;
};

/** 이메일 중복으로 로그인에 실패했을 때, 그 이메일이 어느 방법으로 가입되어 있는지 알려 준다. */
export function RegisteredAccountNotice({ provider }: Props) {
  const [account, setAccount] = useState<RegisteredAccountResponse | null>(null);

  useEffect(() => {
    findRegisteredAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const registered = account?.provider ?? provider;
  const name = providerName(registered);
  const link = LOGIN_LINKS[registered];

  return (
    <>
      <TopBar title="로그인" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <div className="flex-1 px-4 pt-4 pb-10">
          <h1 className="text-[20px] font-bold tracking-tight">{name}로 가입한 이메일이에요</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            이 이메일은 {name} 로그인으로 가입되어 있어요. 이메일 하나에는 로그인 방법 하나만 쓸 수 있어요.
          </p>

          {account && (
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-surface p-4">
              <ProviderBadge provider={account.provider} size="large" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-bold break-all">{account.email}</span>
                <span className="text-[13px] text-text-secondary">{name}로 가입</span>
              </span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-1 border-t border-border bg-background px-4 pt-3 pb-6">
          <SocialLoginLink
            provider={link.provider}
            className={`flex h-13 items-center justify-center gap-2 rounded-button text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action ${link.className}`}
          >
            <LoginIcon provider={registered} />
            {name}로 로그인
          </SocialLoginLink>
          <Link
            href="/login"
            replace
            className="flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
          >
            다른 방법으로 로그인
          </Link>
        </div>
      </main>
    </>
  );
}
