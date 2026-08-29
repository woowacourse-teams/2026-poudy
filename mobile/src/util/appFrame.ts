const DETAIL_PATH = /^\/(products|ingredients)\/\d+$/u;

export const APP_FRAME_SCRIPT = `(function(){var mark=function(){if(!document.documentElement){return false;}document.documentElement.dataset.isApp='true';return true;};if(!mark()){document.addEventListener('readystatechange',mark,{once:true});}})(); true;`;

/** 네이티브 상단바를 두는 자리. 제품 상세와 성분 상세다. */
export const isDetailUrl = (url: string, webBaseUrl: string): boolean => {
  try {
    const current = new URL(url);

    if (current.origin !== new URL(webBaseUrl).origin) {
      return false;
    }

    return DETAIL_PATH.test(current.pathname);
  } catch {
    return false;
  }
};
