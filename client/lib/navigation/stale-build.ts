/*
 * 배포 전에 받아 둔 RSC 응답이 브라우저 캐시에서 나오면, 지금 빌드의 런타임이 지난 빌드의
 * chunk 를 실행하다 무너진다. Next 는 빌드가 다르면 문서를 새로 읽지만, 그 비교는 응답을
 * 해석하며 chunk 를 불러온 뒤라 이 경우를 놓친다. 오류 화면에서 대신 문서를 새로 읽는다.
 */
const STALE_BUILD_MESSAGES = ["module factory is not available", "Failed to load chunk"];

const KEY = "poudy:stale-build-reload";

/* 같은 주소를 다시 읽고도 같은 오류가 나면 새로고침을 되풀이하지 않고 오류 화면을 둔다. */
const RETRY_WINDOW_MS = 10_000;

type ReloadMark = {
  readonly href: string;
  readonly at: number;
};

export const isStaleBuildError = (error: Error): boolean =>
  error.name === "ChunkLoadError" || STALE_BUILD_MESSAGES.some((message) => error.message.includes(message));

const session = () => {
  try {
    if (typeof window === "undefined") return undefined;
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const readMark = (): ReloadMark | undefined => {
  try {
    const parsed: unknown = JSON.parse(session()?.getItem(KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null || !("href" in parsed) || !("at" in parsed)) return undefined;

    const { href, at } = parsed;
    if (typeof href !== "string" || typeof at !== "number") return undefined;

    return { href, at };
  } catch {
    return undefined;
  }
};

const writeMark = (mark: ReloadMark): boolean => {
  try {
    const store = session();
    if (!store) return false;

    store.setItem(KEY, JSON.stringify(mark));
    return true;
  } catch {
    return false;
  }
};

/* 표시를 남기지 못하는 곳에서는 되풀이를 막을 수 없어 새로고침하지 않는다. */
export const reloadForStaleBuild = (error: Error, now: number = Date.now()): void => {
  if (typeof window === "undefined" || !isStaleBuildError(error)) return;

  const href = window.location.href;
  const last = readMark();
  if (last?.href === href && now - last.at < RETRY_WINDOW_MS) return;

  if (!writeMark({ href, at: now })) return;

  window.location.reload();
};
