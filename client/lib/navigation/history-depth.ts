/*
 * 뒤로 갈 자리가 우리 화면인지 가린다.
 *
 * `history.length` 로는 알 수 없다. 검색이나 메신저에서 바로 들어와도 1 보다 크기
 * 때문에, 그대로 뒤로 가면 사이트 밖으로 나간다.
 *
 * 두 가지를 함께 본다.
 * - 이 문서가 사이트 안에서 옮겨 다닌 횟수. 우리가 밀어 넣은 항목만 센다.
 * - 문서를 불러온 출처. 문서를 새로 불러오면 셈이 0 으로 돌아가지만, 우리 화면에서
 *   넘어온 것이라면 바로 앞 항목은 여전히 우리 화면이다.
 */
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
