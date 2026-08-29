const SHARE_MESSAGE_PREFIX = "poudy:share:";

const requestAppShare = (url: string): boolean => {
  if (!window.ReactNativeWebView) {
    return false;
  }

  window.ReactNativeWebView.postMessage(`${SHARE_MESSAGE_PREFIX}${url}`);

  return true;
};

export type ShareResult = "shared" | "copied" | "unavailable";

/** WebView 에는 Web Share API 가 없어 앱에 넘긴다. */
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
