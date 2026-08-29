import { readAppInfo } from "@/lib/analytics/app-info";

const SHARE_MESSAGE_PREFIX = "poudy:share:";

/* 공유를 받기 시작한 앱 버전. 낮은 앱에 보내면 아무 일도 일어나지 않으므로 복사로 돌린다. */
const SHARE_APP_VERSION = "0.1.2";

const toParts = (version: string): readonly number[] => version.split(".").map((part) => Number(part) || 0);

const isAtLeast = (version: string, target: string): boolean => {
  const parts = toParts(version);
  const difference = toParts(target)
    .map((part, index) => (parts[index] ?? 0) - part)
    .find((value) => value !== 0);

  return (difference ?? 0) >= 0;
};

const canAppShare = (): boolean => {
  if (!window.ReactNativeWebView) return false;

  const info = readAppInfo(window.__POUDY_APP__);

  return info.is_app && isAtLeast(info.app_version, SHARE_APP_VERSION);
};

export type ShareResult = "shared" | "copied" | "unavailable";

/** WebView 에는 Web Share API 가 없어 앱에 넘긴다. */
export const sharePage = async (url: string): Promise<ShareResult> => {
  if (canAppShare()) {
    window.ReactNativeWebView?.postMessage(`${SHARE_MESSAGE_PREFIX}${url}`);

    return "shared";
  }

  if (navigator.share) {
    try {
      await navigator.share({ url });
    } catch {
      // 사용자가 닫은 경우다.
    }

    return "shared";
  }

  if (!navigator.clipboard) {
    return "unavailable";
  }

  try {
    await navigator.clipboard.writeText(url);

    return "copied";
  } catch {
    return "unavailable";
  }
};
