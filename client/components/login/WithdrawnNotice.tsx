"use client";

import type { WithdrawnAccountResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProviderBadge } from "./ProviderIcon";

import { AccountDataSummary } from "@/components/my-page/AccountDataSummary";
// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { findWithdrawnAccount, requestRestore } from "@/lib/api/member";
import { formatLongDate } from "@/lib/domain/format";

type RestoreState = "idle" | "sending" | "sent" | "failed";

/** 하단 행동 영역의 보조 글자 버튼(높이 44). 누르면 홈으로 간다. */
function HomeLink({ children }: { readonly children: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/"
      replace
      {...pressableProps}
      className="pressable fb-surface flex h-11 items-center justify-center rounded-xl text-body leading-snug font-semibold text-text-secondary"
    >
      {children}
    </Link>
  );
}

function Deadline({ account }: { readonly account: WithdrawnAccountResponse | null | undefined }) {
  if (account === undefined) return null;
  if (account === null) {
    return <>이 계정을 다시 쓰려면 복구를 요청해 주세요. 확인되면 전에 쓰던 그대로 이어서 쓸 수 있어요.</>;
  }

  return (
    <>
      {formatLongDate(account.withdrawnAt)}에 탈퇴했어요. {formatLongDate(account.restorableUntil)}까지 되살리면 전에
      쓰던 그대로 이어서 쓸 수 있어요.
    </>
  );
}

function RestoreRequested() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center">
      <p role="status" className="text-title leading-relaxed text-text-primary">
        복구를 요청했어요. <br />
        확인되면 다시 로그인할 수 있어요.
      </p>
      <div className="w-full max-w-sm">
        <HomeLink>홈으로</HomeLink>
      </div>
    </main>
  );
}

/**
 * 탈퇴 계정 되살리기(S55g). 탈퇴한 날과 되살릴 수 있는 마지막 날, 어떤 계정인지 보여 준다.
 * [계정 되살리기]는 복구를 요청하고, 관리자가 확인하면 다시 로그인할 수 있다.
 */
export function WithdrawnNotice() {
  const [account, setAccount] = useState<WithdrawnAccountResponse | null | undefined>(undefined);
  const [state, setState] = useState<RestoreState>("idle");

  useEffect(() => {
    findWithdrawnAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const restore = () => {
    setState("sending");
    requestRestore()
      .then(() => setState("sent"))
      .catch(() => setState("failed"));
  };

  if (state === "sent") return <RestoreRequested />;

  return (
    <>
      <TopBar title="계정 되살리기" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-screen font-bold text-text-primary">탈퇴한 계정이에요</h1>
            <p className="text-body text-text-secondary">
              <Deadline account={account} />
            </p>
          </div>

          {account ? (
            <p className="flex items-center gap-2 text-title font-semibold break-all text-text-primary">
              <ProviderBadge provider={account.provider} size="medium" />
              {account.email}
            </p>
          ) : null}

          <AccountDataSummary title="되살리면 그대로 돌아와요" />
        </div>

        {/* TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 화면 끝에 붙인다. */}
        <div className="sticky bottom-0 flex flex-col gap-1 border-t border-border bg-background px-gutter pt-3 pb-safe">
          {/* TODO(#728): 토스트로 알린다. 임시 세션이라 다시 시도하려면 다시 로그인해야 한다. */}
          {state === "failed" ? (
            <p role="alert" className="mb-2 text-center text-body text-text-secondary">
              요청하지 못했어요. 다시 로그인한 뒤 요청해 주세요.
            </p>
          ) : null}
          <Button
            size="lg"
            className="w-full"
            onClick={restore}
            disabled={state === "failed"}
            busy={state === "sending"}
          >
            계정 되살리기
          </Button>
          <HomeLink>다음에 할게요</HomeLink>
        </div>
      </main>
    </>
  );
}
