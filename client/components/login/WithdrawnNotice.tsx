"use client";

import type { WithdrawnAccountResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { TopBar, type TopBarBack } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { AccountActionArea, ActionTextLink } from "./AccountActionArea";
import { AccountCard } from "./AccountCard";

import { AccountDataSummary } from "@/components/my-page/AccountDataSummary";
import { findWithdrawnAccount, requestRestore } from "@/lib/api/member";
import { formatLongDate } from "@/lib/domain/format";
import { providerName } from "@/lib/domain/social-provider";

type RestoreState = "idle" | "sending" | "sent" | "failed";

/*
 * 임시 세션이라 다시 시도하려면 다시 로그인해야 한다. 토스트는 사라지므로, 실패한 뒤에 다시 누르면 요청하지 않고
 * 같은 안내를 다시 띄운다. 버튼을 막으면 사라진 토스트 대신 이유를 읽을 곳이 없다(FEEDBACK F04).
 */
const RESTORE_FAILED = "요청하지 못했어요. 다시 로그인한 뒤 요청해 주세요.";

/* 상단 ‹ 는 [다음에 할게요] · [확인]과 같이 로그인하지 않은 채 홈으로 간다(S55g · S55g-1). 기록을 늘리지 않는다. */
const BACK_HOME: TopBarBack = { asChild: <Link href="/" replace />, label: "홈으로" };

const strong = (children: ReactNode) => <strong className="font-semibold text-text-primary">{children}</strong>;

function Deadline({ account }: { readonly account: WithdrawnAccountResponse | null | undefined }) {
  if (account === undefined) return null;
  if (account === null) {
    return <>이 계정을 다시 쓰려면 복구를 요청해 주세요. 관리자가 확인한 뒤 복구돼요.</>;
  }

  // 문장마다 줄을 나누고 마지막 날만 굵게 강조한다. 좁은 폭에서는 문장 안에서도 자연스럽게 줄을 바꾼다(S55g).
  return (
    <>
      <span className="block">{formatLongDate(account.withdrawnAt)}에 탈퇴했어요.</span>
      <span className="block">{strong(`${formatLongDate(account.restorableUntil)}까지`)} 복구를 요청할 수 있어요.</span>
    </>
  );
}

/** 제목 · 안내 · 계정 카드 · 돌아오는 것. 요청 전(S55g)과 요청 완료(S55g-1)가 같은 틀을 쓴다. */
function RestoreBody({
  title,
  notice,
  account,
}: {
  readonly title: string;
  readonly notice: ReactNode;
  readonly account: WithdrawnAccountResponse | null | undefined;
}) {
  return (
    <main className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-screen font-bold text-text-primary">{title}</h1>
        <p className="text-body text-text-secondary">{notice}</p>
      </div>

      {account ? (
        <AccountCard
          provider={account.provider}
          email={account.email}
          caption={`${providerName(account.provider)}로 로그인`}
        />
      ) : null}

      <AccountDataSummary title="복구되면 그대로 돌아와요" />
    </main>
  );
}

/**
 * 탈퇴 계정 복구 · 요청 완료(S55g-1). 요청을 보낸 직후나, 이미 요청한 계정으로 다시 로그인했을 때 보인다.
 * 관리자가 승인하기 전까지 계정은 탈퇴 상태이고 로그인되지 않는다.
 */
function RestoreRequested({ account }: { readonly account: WithdrawnAccountResponse | null | undefined }) {
  const router = useRouter();

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="계정 복구" titleAs="p" back={BACK_HOME} />
      <ScreenBody>
        <RestoreBody
          title="복구를 요청했어요"
          notice={
            <>
              <span className="block">관리자가 확인한 뒤 복구돼요.</span>
              <span className="block">{strong("복구되면")} 같은 계정으로 다시 로그인해 이어서 쓸 수 있어요.</span>
            </>
          }
          account={account}
        />
      </ScreenBody>

      <BottomActionBar position="screen-end" action={{ label: "확인", onClick: () => router.replace("/") }} />
    </Screen>
  );
}

/**
 * 탈퇴 계정 복구(S55g). 탈퇴한 날과 복구를 요청할 수 있는 마지막 날, 어떤 계정인지 보여 준다.
 * 복구는 사용자가 요청하고 관리자가 승인한 뒤에만 된다. [복구 요청하기]를 누르면 요청 완료(S55g-1)로 바뀐다.
 * 이미 요청한 계정이면(requested) 처음부터 요청 완료를 보여 준다.
 */
export function WithdrawnNotice({ requested = false }: { readonly requested?: boolean }) {
  const [account, setAccount] = useState<WithdrawnAccountResponse | null | undefined>(undefined);
  const [state, setState] = useState<RestoreState>(requested ? "sent" : "idle");
  const toast = useToast();

  useEffect(() => {
    findWithdrawnAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const restore = () => {
    if (state === "failed") {
      toast.show({ message: RESTORE_FAILED });
      return;
    }
    setState("sending");
    requestRestore()
      .then(() => setState("sent"))
      .catch(() => {
        setState("failed");
        toast.show({ message: RESTORE_FAILED });
      });
  };

  if (state === "sent") return <RestoreRequested account={account} />;

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="계정 복구" titleAs="p" back={BACK_HOME} />
      <ScreenBody>
        <RestoreBody title="탈퇴한 계정이에요" notice={<Deadline account={account} />} account={account} />
      </ScreenBody>

      <AccountActionArea>
        <Button size="lg" className="w-full" onClick={restore} busy={state === "sending"}>
          복구 요청하기
        </Button>
        <ActionTextLink href="/">다음에 할게요</ActionTextLink>
      </AccountActionArea>
    </Screen>
  );
}
