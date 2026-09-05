/**
 * 문의를 연 화면의 주소. 서버에는 path 라는 이름으로 보낸다.
 *
 * 조건까지 그대로 담는다. 어떤 조건을 걸고 있었는지 알아야 오류를 재현할 수 있고,
 * 어떤 조합에서 문의가 나오는지도 함께 본다. 처리방침에도 조건을 담는다고 적었다.
 *
 * 다만 500 자 제한이 있어 넘치면 조건을 버리고 경로만 남긴다. 조건은 있으면
 * 좋은 정보이고 경로는 없으면 안 되는 정보다.
 */
const FALLBACK = "/";

/** 주소창에서 고칠 수 있는 값이므로 우리 화면의 경로 모양인지 본다. */
const isOwnPath = (value: string): boolean => value.startsWith("/") && !value.startsWith("//");

/** FeedbackRequest.path 가 허용하는 길이. */
const MAX_LENGTH = 500;

export const toOriginPath = (value: string | null | undefined): string => {
  if (!value) return FALLBACK;

  /* 조각 식별자는 브라우저 안에서만 쓰이므로 서버로 보내지 않는다. */
  const [withQuery] = value.split("#");
  if (!withQuery) return FALLBACK;

  const [pathname] = withQuery.split("?");
  if (!pathname || !isOwnPath(pathname)) return FALLBACK;

  if (withQuery.length <= MAX_LENGTH) return withQuery;

  /* 조건이 길어 넘치면 경로만 남긴다. 그래도 길면 잘라서 보낸다. */
  return pathname.slice(0, MAX_LENGTH);
};
