"use client";

import { OAuthProvider } from "@poudy/api/api.zod";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RegisteredAccountNotice } from "./RegisteredAccountNotice";
import { SIGNUP_SHEET_PATH } from "./SignupSheet";
import { WithdrawnNotice } from "./WithdrawnNotice";

import { completeLoginAnalytics } from "@/lib/analytics/login";
import { findMe } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";
import { completeLoginReturn } from "@/lib/storage/login-return";

type Props = {
  readonly error: string | null;
  readonly provider: string | null;
  readonly status: string | null;
};

/**
 * 로그인 화면으로 돌아가는 버튼 모양의 링크(BTN · Secondary, md 48). 다른 화면으로 가는 행동이라 링크로 둔다.
 * 패키지 Button 은 링크로 그릴 수 없어 같은 모양과 누름 상태(usePressable, fb-secondary, press-scale)만 옮겼다.
 * 높이는 최소 높이로 두고 낱말 단위로 줄을 넘겨, 기기 글자 크기를 키워도 글자가 버튼 밖으로 넘치지 않는다.
 */
function BackToLoginLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/login"
      replace
      {...pressableProps}
      className="pressable press-scale fb-secondary inline-flex min-h-12 items-center justify-center rounded-xl bg-button-secondary px-4 py-3 text-center text-14 leading-none font-semibold break-keep text-text-primary select-none"
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
        completeLoginAnalytics(member);
        rememberLastLogin(member.provider);
        completeLoginReturn(router.replace);
      })
      .catch(() => setFailure(SIGN_IN_FAILED));
  }, [error, router]);

  if (!failure) return <Signing />;

  const message = loginErrorMessage(failure, provider);

  // 로그인 실패(S353). 공통 오류 화면(ErrorState screen)과 같은 모양이고, 상단 내비와 오류 코드는 두지 않는다.
  return (
    <main className="flex min-h-svh flex-col">
      <ErrorState
        variant="screen"
        icon={<Icon name="alert-circle" size={28} />}
        title={message.title}
        description={message.description}
        action={<BackToLoginLink />}
        className="flex-1"
      />
    </main>
  );
}
