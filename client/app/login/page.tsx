import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { BrowseWithoutLoginLink } from "@/components/login/BrowseWithoutLoginLink";
import { LoginUpdateNotice } from "@/components/login/LoginUpdateNotice";
import { SignupSheet } from "@/components/login/SignupSheet";
import { SocialLoginButtons } from "@/components/login/SocialLoginButtons";
import { TermsNotice } from "@/components/login/TermsNotice";

export const metadata: Metadata = {
  title: "로그인",
  description: "파우디에 로그인하고 내 피부에 맞는 제품을 이어서 살펴보세요.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
  openGraph: null,
  twitter: null,
};

/** 로그인(S37). 소셜 로그인 버튼은 늘 이름이 적힌 넓은 버튼이고, 최근 로그인 방법이 있으면 맨 위로 올린다(S37c). */
export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col">
      <section
        aria-labelledby="login-title"
        className="flex flex-1 flex-col items-center justify-center gap-6 px-gutter pb-10 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="" width={56} height={73} preload className="h-auto w-14" />
          <p className="text-title font-bold text-brand-text">파우디</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 id="login-title" className="text-hero font-bold text-text-primary">
            화장품 선택에 <br />
            <span className="text-brand-strong">나만의 기준</span>을 더하다
          </h1>
          <p className="text-body-sm text-text-secondary">
            나의 화장품 경험을 성분 필터로 연결해, <br />더 나다운 선택을 시작하세요.
          </p>
        </div>
      </section>

      <div className="flex shrink-0 flex-col gap-2 px-gutter pb-safe">
        <SocialLoginButtons />
        <TermsNotice />
        <BrowseWithoutLoginLink />
      </div>

      <Suspense fallback={null}>
        <SignupSheet />
      </Suspense>
      <LoginUpdateNotice />
    </main>
  );
}
