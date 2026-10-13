import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { LoginUpdateNotice } from "@/components/login/LoginUpdateNotice";
import { GoogleIcon, KakaoIcon } from "@/components/login/ProviderIcon";
import { SignupSheet } from "@/components/login/SignupSheet";
import { SocialLoginLink } from "@/components/login/SocialLoginLink";

export const metadata: Metadata = {
  title: "로그인",
  description: "파우디에 로그인하고 내 피부에 맞는 제품을 이어서 살펴보세요.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
  openGraph: null,
  twitter: null,
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col px-4 pb-6">
      <section
        aria-labelledby="login-title"
        className="flex min-h-[420px] flex-1 flex-col items-center justify-center py-16 text-center"
      >
        <div className="flex flex-col items-center gap-5">
          <Image src="/logo.png" alt="" width={80} height={89} preload className="h-[52px] w-auto" />
          <p className="text-[16px] font-bold text-[#cc3864]">파우디</p>
        </div>

        <h1 id="login-title" className="mt-8 text-[22px] leading-[1.5] font-bold tracking-tight sm:text-[24px]">
          내 피부에 맞는 성분, <br />
          이제 저장해 두고 이어 보세요
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary sm:text-[16px]">
          로그인하면 저장한 제품을 <br />
          다른 기기에서도 그대로 볼 수 있어요.
        </p>
      </section>

      <div className="flex shrink-0 flex-col gap-2.5">
        <SocialLoginLink
          provider="kakao"
          className="flex h-[52px] items-center justify-center gap-2 rounded-button bg-[#fee500] text-[16px] font-bold text-[#191919] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          <KakaoIcon />
          카카오로 시작하기
        </SocialLoginLink>
        <SocialLoginLink
          provider="google"
          className="flex h-[52px] items-center justify-center gap-2 rounded-button border border-[#8b8d8b] bg-background text-[16px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          <GoogleIcon />
          Google로 시작하기
        </SocialLoginLink>

        <p className="mt-1 text-center text-[11px] leading-relaxed text-text-secondary sm:text-[12px]">
          시작하면{" "}
          <Link
            href="/terms"
            className="rounded-sm font-bold text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            이용약관
          </Link>
          과{" "}
          <Link
            href="/privacy"
            className="rounded-sm font-bold text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            개인정보 처리방침
          </Link>
          에 동의하게 돼요.
        </p>
        <Link
          href="/"
          replace
          className="mt-1 flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          로그인 없이 둘러보기
        </Link>
      </div>

      <Suspense fallback={null}>
        <SignupSheet />
      </Suspense>
      <LoginUpdateNotice />
    </main>
  );
}
