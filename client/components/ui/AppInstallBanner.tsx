"use client";

import { useState, useSyncExternalStore } from "react";

import { Icon } from "./icons/Icon";

import { readAppInfo } from "@/lib/analytics/app-info";
import { shouldShowAppBanner } from "@/lib/domain/app-banner";
import { buildInstallIntentUrl } from "@/lib/navigation/open-app";

const DISMISS_KEY = "poudy.app-banner.dismissed";

/**
 * 이 방문에서 닫았는지 기억한다.
 *
 * 사생활 보호 모드처럼 저장이 막힌 환경에서는 읽기와 쓰기가 모두 예외를 던진다.
 * 기억하지 못하더라도 화면은 그대로 떠야 하므로 삼키고 넘어간다.
 */
const readDismissed = (): boolean => {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
};

const writeDismissed = (): void => {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "true");
  } catch {
    /* 기억하지 못해도 이 화면에서 닫힌 것은 상태로 남는다. */
  }
};

/* 환경은 스스로 알려 오지 않는다. 그릴 때마다 그때의 환경을 읽는다. */
const subscribe = (): (() => void) => () => {};

const browserQualifies = (): boolean => {
  const isInAppWebView = readAppInfo(window.__POUDY_APP__).is_app || Boolean(window.ReactNativeWebView);

  return shouldShowAppBanner({
    userAgent: navigator.userAgent,
    isInAppWebView,
    dismissed: readDismissed(),
  });
};

/* 서버에는 기기도 저장소도 없다. 미리 만든 화면은 띄우지 않는 쪽으로 그린다. */
const serverHides = (): boolean => false;

/**
 * 좁은 화면의 머리 위에 붙는 안드로이드 앱 설치 배너.
 *
 * 넓은 화면은 왼쪽 여백의 QR 코드(`AppQrPanel`)가 같은 몫을 하므로 여기서는 감춘다.
 * 두 자리가 같은 화면에 함께 서면 같은 말을 두 번 한다.
 *
 * 판별에 쓰는 것이 모두 브라우저에만 있어 서버에서 미리 그릴 때는 알 수 없다. 그래서
 * 붙은 뒤에 판단하며, 미리 만든 화면은 띄우지 않는 쪽으로 그린다. 반대로 두면
 * 안드로이드가 아닌 사람에게도 한 번 스쳐 지나간다.
 */
export function AppInstallBanner() {
  const qualifies = useSyncExternalStore(subscribe, browserQualifies, serverHides);
  /* 닫기는 이 화면에서 일어나는 일이라 따로 둔다. 저장소는 다음 방문을 위해 남긴다. */
  const [dismissed, setDismissed] = useState(false);

  const dismiss = () => {
    setDismissed(true);
    writeDismissed();
  };

  /*
   * 누르는 순간의 주소를 읽는다. 그려질 때 담아 두면 같은 화면에 머무는 동안 조건이
   * 바뀌어도 처음 주소로 열린다.
   */
  const openApp = () => {
    window.location.href = buildInstallIntentUrl(window.location.href);
  };

  if (!qualifies || dismissed) return null;

  return (
    <div className="flex items-center gap-2 bg-brand-soft py-2 pr-2 pl-4 lg:hidden">
      {/*
        배너 전체가 아니라 글자만 누르게 한다. 닫기가 그 안에 겹쳐 있으면 닫으려다
        스토어로 가는 일이 생긴다.
      */}
      <button
        type="button"
        onClick={openApp}
        className="flex flex-1 items-center gap-1 text-left text-[13px] font-bold text-brand"
      >
        이 화면을 앱에서 열기
        <Icon name="chevron-right" size={16} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label="앱 설치 안내 닫기"
        className="flex size-8 shrink-0 items-center justify-center text-text-secondary"
      >
        <Icon name="x" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
