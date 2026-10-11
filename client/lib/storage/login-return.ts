const KEY = "poudy.login-return.v1";
const HOME = "/";
const NOT_RETURNABLE = ["/login", "/onboarding"];

/*
 * 로그인하러 떠난 페이지를 기억했다가 로그인을 마치면 돌려보낸다. 카카오·구글 OAuth 는 페이지를 떠났다가
 * 돌아오므로 메모리가 아니라 탭에 남는 sessionStorage 에 둔다.
 */
const sessionStore = (): Storage | undefined => {
  try {
    if (typeof window === "undefined") return undefined;
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const isReturnable = (path: string): boolean =>
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !NOT_RETURNABLE.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));

/** 지금 보고 있는 페이지를 로그인한 뒤 돌아올 곳으로 기억한다. */
export const rememberLoginReturn = (): void => {
  const path = `${window.location.pathname}${window.location.search}`;
  if (!isReturnable(path)) return;

  try {
    sessionStore()?.setItem(KEY, path);
  } catch {
    // 기억하지 못하면 로그인한 뒤 홈으로 간다.
  }
};

/** 기억한 페이지를 꺼내고 지운다. 없거나 사이트 안의 경로가 아니면 홈이다. */
export const takeLoginReturn = (): string => {
  try {
    const store = sessionStore();
    const path = store?.getItem(KEY) ?? null;
    store?.removeItem(KEY);
    if (path !== null && isReturnable(path)) return path;
  } catch {
    // 읽지 못하면 홈으로 간다.
  }
  return HOME;
};
