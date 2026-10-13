import { APP_UPDATE_STORE_URL } from "@/lib/navigation/open-app";

declare global {
  interface Window {
    readonly __POUDY_APP_UPDATE__?: unknown;
  }
}

const APP_UPDATE_MESSAGE = "poudy:app-update";

const canAppUpdate = (): boolean => Boolean(window.ReactNativeWebView) && window.__POUDY_APP_UPDATE__ === true;

/**
 * 앱 안에서 업데이트를 받게 한다.
 *
 * 앱 내 업데이트를 지원하는 앱이면 앱에 맡기고, 예전 앱이면 Play 스토어 주소로 옮긴다.
 * 예전 앱도 서비스 밖 주소는 WebView 가 아니라 기기에 넘기므로 Play 스토어 앱이 열린다.
 */
export const requestAppUpdate = (): void => {
  if (canAppUpdate()) {
    window.ReactNativeWebView?.postMessage(APP_UPDATE_MESSAGE);
    return;
  }

  window.location.href = APP_UPDATE_STORE_URL;
};
