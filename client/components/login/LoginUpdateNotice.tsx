"use client";

import { Button } from "@poudy/design-system/button";
import { useSyncExternalStore } from "react";

import { BrowseWithoutLoginLink } from "./BrowseWithoutLoginLink";

import { readAppInfo } from "@/lib/analytics/app-info";
import { requiresUpdateForLogin } from "@/lib/domain/app-version";
import { requestAppUpdate } from "@/lib/interaction/app-update";

/* 앱이 알려 오는 버전은 문서가 만들어질 때 한 번 정해진다. 그릴 때마다 그때의 값을 읽는다. */
const subscribe = (): (() => void) => () => {};

const browserRequires = (): boolean => requiresUpdateForLogin(readAppInfo(window.__POUDY_APP__));

/* 서버는 앱 안인지 모른다. 미리 만든 화면은 로그인 버튼을 보이는 쪽으로 그린다. */
const serverAllows = (): boolean => false;

/**
 * 로그인을 지원하지 않는 예전 앱에서 로그인 화면을 덮는 업데이트 안내.
 *
 * 예전 앱에서 로그인을 누르면 로그인이 외부 브라우저에서 끝나 앱은 로그인되지 않는다.
 * 앱의 다른 화면은 그대로 쓸 수 있으므로 로그인 화면만 막는다.
 */
export function LoginUpdateNotice() {
  const required = useSyncExternalStore(subscribe, browserRequires, serverAllows);

  if (!required) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="login-update-title"
      className="fixed inset-0 z-(--z-dialog) flex flex-col bg-background px-gutter pb-safe"
    >
      <div className="flex flex-1 flex-col justify-center gap-2">
        <h2 id="login-update-title" className="text-screen font-bold text-text-primary">
          로그인하려면 앱을 업데이트해 주세요
        </h2>
        <p className="text-body text-text-secondary">
          지금 쓰는 앱에서는 로그인할 수 없어요. 업데이트하면 바로 로그인할 수 있어요.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Button size="lg" className="w-full" onClick={requestAppUpdate}>
          업데이트
        </Button>
        <BrowseWithoutLoginLink />
      </div>
    </div>
  );
}
