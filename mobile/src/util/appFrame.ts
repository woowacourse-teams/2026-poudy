const DETAIL_PATH = /^\/(products|ingredients)\/\d+$/u;

export const APP_FRAME_SCRIPT = `(function(){var mark=function(){if(!document.documentElement){return false;}document.documentElement.dataset.isApp='true';return true;};if(!mark()){document.addEventListener('readystatechange',mark,{once:true});}})(); true;`;

/** 웹의 주소인지. 아닌 자리에서는 방문 기록 대신 홈으로 돌아간다. */
export const isWebUrl = (url: string, webBaseUrl: string): boolean => {
  try {
    return new URL(url).origin === new URL(webBaseUrl).origin;
  } catch {
    return false;
  }
};

/** 네이티브 상단바를 두는 자리. 제품 상세와 성분 상세다. */
export const isDetailUrl = (url: string, webBaseUrl: string): boolean => {
  if (!isWebUrl(url, webBaseUrl)) {
    return false;
  }

  try {
    return DETAIL_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
};
