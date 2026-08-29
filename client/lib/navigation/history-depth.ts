/* `history.length` 로는 이전 항목이 우리 화면인지 알 수 없다. 우리가 밀어 넣은 항목만 센다. */
let depth = 0;

const cameFromSameOrigin = (): boolean => {
  if (!document.referrer) {
    return false;
  }

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
};

export const hasInSiteHistory = (): boolean => depth > 0 || cameFromSameOrigin();

export const markPush = () => {
  depth += 1;
};

export const markPop = () => {
  depth = Math.max(0, depth - 1);
};
