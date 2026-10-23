/**
 * 나만의 필터를 켜 둘지 사용자가 고른 값.
 *
 * 주소에 담으면 공유한 링크로 켬 상태가 옮겨 가서, 보는 사람의 브라우저에 쿠키로 둔다. 서버 렌더도 첫 장을 같은 설정으로
 * 그려야 해서 localStorage 가 아니라 쿠키다. 클라이언트가 쓰므로 HttpOnly 가 없고, 서버(cookies())와 클라이언트
 * (document.cookie)가 모두 읽는다. 쿠키가 없으면 켬이다.
 */
export const MY_FILTER_COOKIE = "poudy-my-filter";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** 쿠키 값의 켬 여부. 없거나 모르는 값이면 기본인 켬이다. */
export const isMyFilterOn = (value: string | undefined): boolean => value !== "off";

/** 브라우저의 쿠키에서 읽는다. 서버에서 부르면 기본(켬)이다. */
export const readMyFilterOn = (): boolean => {
  if (typeof document === "undefined") return true;
  const match = new RegExp(`(?:^|; )${MY_FILTER_COOKIE}=([^;]*)`).exec(document.cookie);
  return isMyFilterOn(match?.[1]);
};

/** 켜고 끈 선택을 1년 동안 남긴다. 다른 사이트에서 오는 요청에는 싣지 않는다. */
export const writeMyFilterOn = (on: boolean): void => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${MY_FILTER_COOKIE}=${on ? "on" : "off"}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
};
