const KEY = "poudy:page-entry";
const MAX_AGE = 30 * 60 * 1000;

/** 추적값만 URL에서 분리한다. 콘텐츠를 결정하는 쿼리와 해시는 유지한다. */
export const separateEntry = (href: string): { readonly href: string; readonly entryPoint?: string } => {
  const url = new URL(href, "https://poudy.site");
  const entryPoint = url.searchParams.get("from") ?? undefined;
  if (!entryPoint) return { href };
  url.searchParams.delete("from");
  return { href: `${url.pathname}${url.search}${url.hash}`, entryPoint };
};

export const rememberPageEntry = (href: string, entryPoint: string): void => {
  try {
    const url = new URL(href, window.location.origin);
    const path = url.pathname + url.search;
    window.sessionStorage.setItem(`${KEY}:${path}`, JSON.stringify({ path, entryPoint, at: Date.now() }));
  } catch {
    // 저장소가 막혀도 탐색은 계속한다.
  }
};

export const readPageEntry = (): string | undefined => {
  try {
    const current = separateEntry(window.location.pathname + window.location.search).href;
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(`${KEY}:${current}`) ?? "null");
    if (typeof raw !== "object" || raw === null || !("path" in raw) || !("at" in raw) || !("entryPoint" in raw))
      return undefined;
    if (typeof raw.at !== "number" || typeof raw.entryPoint !== "string") return undefined;
    if (raw.path !== current || Date.now() - raw.at < 0 || Date.now() - raw.at > MAX_AGE) return undefined;
    return raw.entryPoint;
  } catch {
    return undefined;
  }
};
