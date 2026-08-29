const SHARE_MESSAGE_PREFIX = "poudy:share:";

/** 앱은 시스템 공유 시트를 띄운다. WebView 에는 Web Share API 가 없다. */
const requestAppShare = (url: string): boolean => {
  if (!window.ReactNativeWebView) {
    return false;
  }

  window.ReactNativeWebView.postMessage(`${SHARE_MESSAGE_PREFIX}${url}`);

  return true;
};

export type ShareResult = "shared" | "copied" | "unavailable";

/**
 * 지금 보고 있는 주소를 밖으로 내보낸다.
 *
 * 앱이면 앱에 넘기고, 공유를 지원하는 브라우저면 공유 시트를, 둘 다 아니면 주소를
 * 복사한다. 취소는 실패가 아니므로 조용히 지나간다.
 */
export const sharePage = async (url: string): Promise<ShareResult> => {
  if (requestAppShare(url)) {
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
