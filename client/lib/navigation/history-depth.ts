/* `history.length` 로는 이전 항목이 우리 화면인지 알 수 없다. 우리가 밀어 넣은 항목만 센다. */
const KEY = "poudy:history-depth";

const session = () => {
  try {
    if (typeof window === "undefined") return undefined;
    return window.sessionStorage;
  } catch {
    /* 사생활 보호 모드처럼 저장을 막는 곳에서는 이번 문서 안에서만 센다. */
    return undefined;
  }
};

/*
 * 문서를 다시 읽으면 세어 둔 값이 사라진다. 새로고침은 방문 기록을 건드리지 않으므로
 * 세어 둔 값도 그대로여야 한다. 탭 안에서만 남는 자리에 맡겨 두었다가 되살린다.
 *
 * 되살리는 때를 새로고침으로만 좁힌다. 밖에서 새로 들어온 문서는 방문 기록이 우리 것이
 * 아니어서, 같은 탭에 남아 있던 값을 그대로 믿으면 사이트 밖으로 되돌아간다.
 */
const restore = (): number => {
  if (typeof performance === "undefined") return 0;

  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (entry?.type !== "reload") return 0;

  const stored = Number(session()?.getItem(KEY));
  if (!Number.isInteger(stored) || stored < 0) return 0;

  return stored;
};

let depth = restore();

const save = () => {
  try {
    session()?.setItem(KEY, String(depth));
  } catch {
    /* 저장하지 못해도 이번 문서 안에서 센 값은 그대로 쓴다. */
  }
};

/*
 * 0 에서 시작하기로 했으면 남은 값을 바로 덮는다. 새 탭은 연 탭의 저장소를 복사해 올 수
 * 있어, 지우지 않으면 그 탭에서 새로고침할 때 남의 탭에서 센 값이 되살아난다.
 */
save();

const cameFromSameOrigin = (): boolean => {
  if (!document.referrer) {
    return false;
  }

  try {
    const referrer = new URL(document.referrer);
    /* 새로고침이 자기 주소를 남기는 곳이 있다. 다른 화면에서 온 것이 아니다. */
    if (referrer.href === window.location.href) {
      return false;
    }

    return referrer.origin === window.location.origin;
  } catch {
    return false;
  }
};

export const hasInSiteHistory = (): boolean => depth > 0 || cameFromSameOrigin();

export const markPush = () => {
  depth += 1;
  save();
};

export const markPop = () => {
  depth = Math.max(0, depth - 1);
  save();
};
