"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { useToast } from "@poudy/design-system/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BrowseWithoutLoginLink } from "./BrowseWithoutLoginLink";

import { completeLoginAnalytics, markSignupAnalytics } from "@/lib/analytics/login";
import { ApiError } from "@/lib/api/client";
import { findMe, signUp } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";

const SIGNUP_PARAMETER = "signup";
const OVER_FOURTEEN = "over-fourteen";
const SIGNUP_REQUIRED = "required";

/** 처음 소셜 로그인한 사람을 이 주소로 보내면 로그인 화면 위에 가입 확인 시트가 열린다. */
export const SIGNUP_SHEET_PATH = `/login?${SIGNUP_PARAMETER}=${SIGNUP_REQUIRED}`;

type SignupState = "idle" | "sending" | "expired" | "failed";

const failureOf = (error: unknown): { readonly state: SignupState; readonly message: string } => {
  if (error instanceof ApiError && error.code === "SIGNUP_ACCOUNT_NOT_FOUND") {
    return { state: "expired", message: "가입 시간이 지났어요. 다시 로그인해 주세요." };
  }
  if (error instanceof ApiError && error.code === "MEMBER_EMAIL_ALREADY_REGISTERED") {
    return { state: "expired", message: loginErrorMessage(error.code, null) };
  }
  return { state: "failed", message: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
};

/**
 * 처음 소셜 로그인한 사람에게만 열린다(S37a). 만 14세 미만은 법정대리인 동의 절차가 없어 받지 않으므로,
 * 직접 체크해야만 가입할 수 있다. 닫고 떠나면 서버에 맡겨 둔 계정은 10분 뒤 사라진다.
 *
 * 명세의 하단은 [동의하고 계속] 아래에 [로그인 없이 둘러보기] 글자 버튼을 둔다. 확인 시트(ConfirmSheet)의 취소 · 실행
 * 두 버튼 모양과 달라, BottomSheet 그릇에 머리와 본문을 넣고 하단은 이 시트에서 짠다.
 */
export function SignupSheet() {
  const router = useRouter();
  const toast = useToast();
  const open = useSearchParams().get(SIGNUP_PARAMETER) === SIGNUP_REQUIRED;
  const [overFourteen, setOverFourteen] = useState(false);
  const [state, setState] = useState<SignupState>("idle");
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);

  const submit = () => {
    if (!overFourteen || state === "sending") return;
    // 다시 로그인해야만 가입할 수 있다. 토스트는 사라지므로 다시 누르면 같은 안내를 다시 띄운다.
    if (state === "expired" && expiredMessage) {
      toast.show({ message: expiredMessage });
      return;
    }

    setState("sending");
    signUp()
      .then(() => {
        markSignupAnalytics();
        findMe()
          .then((member) => {
            completeLoginAnalytics(member);
            rememberLastLogin(member.provider);
          })
          .catch(() => undefined);
        router.replace("/signup/profile");
      })
      .catch((error: unknown) => {
        const failure = failureOf(error);
        setState(failure.state);
        if (failure.state === "expired") setExpiredMessage(failure.message);
        toast.show({ message: failure.message });
      });
  };

  return (
    <BottomSheet open={open} onClose={() => router.replace("/login")}>
      <BottomSheetHeader title="가입 전에 확인해 주세요" description="파우디는 만 14세 이상만 가입할 수 있어요." />

      <BottomSheetBody>
        {/* 체크하면 테두리 색만 바꾼다(STATE S07 선택 · fast · ease). 동작 줄이기에서도 색 전환은 그대로 둔다(M03). */}
        <div className="rounded-lg border border-border-strong bg-background px-3 transition-colors duration-(--duration-fast) ease-initial has-checked:border-action">
          <CheckboxGroup
            aria-label="나이 확인"
            value={overFourteen ? [OVER_FOURTEEN] : []}
            onValueChange={(value) => setOverFourteen(value.includes(OVER_FOURTEEN))}
          >
            <CheckboxGroupItem value={OVER_FOURTEEN}>만 14세 이상이에요</CheckboxGroupItem>
          </CheckboxGroup>
        </div>
      </BottomSheetBody>

      {/* 토스트는 이 하단 바로 위에 뜬다(data-toast-offset, globals.css). */}
      <div data-toast-offset="sheet-footer" className="flex shrink-0 flex-col gap-2 px-5 pt-5 pb-safe">
        <Button
          className="w-full"
          onClick={submit}
          aria-disabled={!overFourteen || undefined}
          busy={state === "sending"}
        >
          동의하고 계속
        </Button>
        <BrowseWithoutLoginLink />
      </div>
    </BottomSheet>
  );
}
