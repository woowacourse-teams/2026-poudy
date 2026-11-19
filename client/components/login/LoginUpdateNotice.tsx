"use client";

import { Button } from "@poudy/design-system/button";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { useSyncExternalStore } from "react";

import { AccountActionArea } from "./AccountActionArea";
import { BrowseWithoutLoginLink } from "./BrowseWithoutLoginLink";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { readAppInfo } from "@/lib/analytics/app-info";
import { requiresUpdateForLogin } from "@/lib/domain/app-version";
import { requestAppUpdate } from "@/lib/interaction/app-update";

/* 앱이 알려 오는 버전은 문서가 만들어질 때 한 번 정해진다. 그릴 때마다 그때의 값을 읽는다. */
const subscribe = (): (() => void) => () => {};

const browserRequires = (): boolean => requiresUpdateForLogin(readAppInfo(window.__POUDY_APP__));

/* 서버는 앱 안인지 모른다. 미리 만든 화면은 로그인 버튼을 보이는 쪽으로 그린다. */
const serverAllows = (): boolean => false;

/**
 * 로그인을 지원하지 않는 예전 앱에서 로그인 화면을 덮는 업데이트 안내(S344).
 *
 * 예전 앱에서 로그인을 누르면 로그인이 외부 브라우저에서 끝나 앱은 로그인되지 않는다.
 * 앱의 다른 화면은 그대로 쓸 수 있으므로 로그인 화면만 막는다.
 *
 * 로그인 안내 화면(S349~S352)과 같은 틀이다. 상단 내비 아래에 제목과 문장마다 한 줄인 설명을 위쪽부터 두고,
 * 하단 행동 영역에 [업데이트]와 [로그인 없이 둘러보기]를 둔다.
 */
export function LoginUpdateNotice() {
  const required = useSyncExternalStore(subscribe, browserRequires, serverAllows);

  if (!required) return null;

  return <UpdateNotice />;
}

/*
 * 상단 ‹ 는 로그인 화면을 떠난다. 안내만 닫으면 이 앱에서 끝낼 수 없는 로그인 버튼이 드러나므로 로그인 화면에 머물지 않는다.
 * 사이트 안에서 온 기록이 있으면 로그인을 누르기 전 화면으로 돌아가고, 없으면 [로그인 없이 둘러보기]와 같은 홈으로 간다.
 */
function UpdateNotice() {
  const back = useSubScreenBack();

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="login-update-title"
      className="fixed inset-0 z-(--z-dialog) bg-background"
    >
      <Screen scroll="body">
        <TopBar variant="sub" title="로그인" titleAs="p" back={back} />
        <ScreenBody>
          <div className="flex flex-col gap-2 px-gutter py-4">
            <h2 id="login-update-title" className="text-screen font-bold text-text-primary">
              로그인하려면 앱을 업데이트해 주세요
            </h2>
            <p className="text-body text-text-secondary">
              <span className="block">지금 쓰는 앱에서는 로그인할 수 없어요.</span>
              <span className="block">업데이트하면 바로 로그인할 수 있어요.</span>
            </p>
          </div>
        </ScreenBody>

        <AccountActionArea>
          <Button size="lg" className="w-full" onClick={requestAppUpdate}>
            업데이트
          </Button>
          <BrowseWithoutLoginLink />
        </AccountActionArea>
      </Screen>
    </div>
  );
}
