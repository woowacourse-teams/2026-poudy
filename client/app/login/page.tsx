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

/** 로그인(S37). 소셜 로그인 버튼은 늘 이름이 적힌 넓은 버튼이다. */
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
            내 피부에 맞는 성분, <br />
            이제 저장해 두고 이어 보세요
          </h1>
          <p className="text-title text-text-secondary">
            로그인하면 마음에 드는 제품을 위시리스트에 추가해 모아 볼 수 있어요.
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
