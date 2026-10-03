import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "로그인",
  description: "파우디에 로그인하고 내 피부에 맞는 제품을 이어서 살펴보세요.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
  openGraph: null,
  twitter: null,
};

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 3C5.93 3 1 6.87 1 11.65c0 3.07 2.04 5.76 5.11 7.29l-1.3 4.09c-.1.31.25.56.51.37l4.82-3.2c.61.08 1.23.12 1.86.12 6.07 0 11-3.88 11-8.67S18.07 3 12 3Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.34-2.59Z" />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.34 2.59C7.19 7.73 9.4 5.97 12 5.97Z"
      />
    </svg>
  );
}

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
        <button
          type="button"
          disabled
          title="카카오 로그인 준비 중"
          className="flex h-[52px] items-center justify-center gap-2 rounded-button bg-[#fee500] text-[16px] font-bold text-[#191919]"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>
        <button
          type="button"
          disabled
          title="Google 로그인 준비 중"
          className="flex h-[52px] items-center justify-center gap-2 rounded-button border border-[#8b8d8b] bg-background text-[16px] font-bold"
        >
          <GoogleIcon />
          Google로 시작하기
        </button>

        <Link
          href="/"
          replace
          className="mt-1 flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          로그인 없이 둘러보기
        </Link>
        <p className="mt-1 text-center text-[11px] leading-relaxed text-text-secondary sm:text-[12px]">
          시작하면{" "}
          <Link
            href="/terms"
            className="rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            이용약관
          </Link>
          과{" "}
          <Link
            href="/privacy"
            className="rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            개인정보 처리방침
          </Link>
          에 동의하게 돼요.
        </p>
      </div>
    </main>
  );
}
