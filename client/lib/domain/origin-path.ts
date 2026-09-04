/**
 * 문의를 연 화면의 경로. 서버에는 path 라는 이름으로 보낸다.
 *
 * 쿼리 문자열은 떼고 경로만 남긴다. /products 처럼 조건을 주소에 담는 화면에서는
 * 검색어와 성분 조건이 함께 실려 가는데, 화면에서는 민감한 정보를 적지 말라고
 * 안내하면서 사용자가 입력한 적 없는 값을 보내면 안 된다. 조건이 여러 개 붙으면
 * 500 자 제한을 넘길 수도 있다.
 */
const FALLBACK = "/";

/** 주소창에서 고칠 수 있는 값이므로 우리 화면의 경로 모양인지 본다. */
const isOwnPath = (value: string): boolean => value.startsWith("/") && !value.startsWith("//");

export const toOriginPath = (value: string | null | undefined): string => {
  if (!value) return FALLBACK;

  const [pathname] = value.split(/[?#]/);
  if (!pathname || !isOwnPath(pathname)) return FALLBACK;

  return pathname;
};
