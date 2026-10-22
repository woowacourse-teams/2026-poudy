"use client";

import { OAuthProvider } from "@poudy/api/api.zod";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RegisteredAccountNotice } from "./RegisteredAccountNotice";
import { SIGNUP_SHEET_PATH } from "./SignupSheet";
import { WithdrawnNotice } from "./WithdrawnNotice";

import { findMe } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";
import { completeLoginReturn } from "@/lib/storage/login-return";

type Props = {
  readonly error: string | null;
  readonly provider: string | null;
  readonly status: string | null;
};

/** 로그인 화면으로 돌아가는 버튼 모양의 링크(BTN · Large Primary). */
function BackToLoginLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/login"
      replace
      {...pressableProps}
      className="pressable press-scale fb-dim flex h-14 w-full max-w-sm items-center justify-center rounded-xl bg-action text-16 leading-none font-bold text-action-text"
    >
      로그인 화면으로
    </Link>
  );
}

/*
 * 로그인 확인은 대개 금방 끝나 다음 화면으로 넘어간다. 300ms 안에 끝나면 문구를 띄우지 않아 깜박이지 않게 한다(FEEDBACK F02).
 * 라이브 영역은 처음부터 그려 두고 내용만 채운다(A11Y D06).
 */
function Signing() {
  const shown = useDelayedFlag(true);

  return (
    <main className="flex min-h-svh items-center justify-center px-gutter">
      <p role="status" className="text-title text-text-secondary">
        {shown ? "로그인하는 중이에요" : null}
      </p>
    </main>
  );
}

const SIGN_IN_FAILED = "OAUTH_LOGIN_FAILED";
const EMAIL_ALREADY_REGISTERED = "MEMBER_EMAIL_ALREADY_REGISTERED";

const WITHDRAWN = "WITHDRAWN";
const RESTORE_REQUESTED = "RESTORE_REQUESTED";
const SIGNUP_REQUIRED = "SIGNUP_REQUIRED";

export function LoginCallback({ error, provider, status }: Props) {
  // 이미 복구를 요청한 탈퇴 계정이면 요청 완료(S55g-1)를 보여 준다.
  if (status === RESTORE_REQUESTED) return <WithdrawnNotice requested />;
  if (status === WITHDRAWN) return <WithdrawnNotice />;
  if (status === SIGNUP_REQUIRED) return <SignupRedirect />;

  const registered = OAuthProvider.safeParse(provider);
  if (error === EMAIL_ALREADY_REGISTERED && registered.success) {
    return <RegisteredAccountNotice provider={registered.data} />;
  }

  return <SignInResult error={error} provider={provider} />;
}

function SignupRedirect() {
  const router = useRouter();

  useEffect(() => router.replace(SIGNUP_SHEET_PATH), [router]);

  return <Signing />;
}

function SignInResult({ error, provider }: Pick<Props, "error" | "provider">) {
  const router = useRouter();
  const [failure, setFailure] = useState(error);

  useEffect(() => {
    if (error) return;

    findMe()
      .then((member) => {
        rememberLastLogin(member.provider);
        completeLoginReturn(router.replace);
      })
      .catch(() => setFailure(SIGN_IN_FAILED));
  }, [error, router]);

  if (!failure) return <Signing />;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center">
      <p role="alert" className="text-title leading-relaxed text-text-primary">
        {loginErrorMessage(failure, provider)}
      </p>
      <BackToLoginLink />
    </main>
  );
}
