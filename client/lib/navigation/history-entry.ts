declare global {
  interface Window {
    /** Navigation API. 아직 표준 타입에 없어 쓰는 부분만 적는다. */
    readonly navigation?: {
      readonly currentEntry: { readonly key: string } | null;
    };
  }
}

/**
 * 지금 보고 있는 방문 기록 항목.
 *
 * 뒤로가기·앞으로가기로 같은 항목에 돌아오면 같은 값이고, 링크로 새로 들어오면 다른 값이다.
 * Navigation API 가 없는 브라우저에서는 알 수 없다.
 */
export const currentHistoryEntry = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.navigation?.currentEntry?.key;
};

/**
 * 담아 둔 항목으로 돌아왔는지.
 *
 * 어느 한쪽이라도 모르면 돌아온 것으로 본다. Navigation API 가 없는 브라우저에서는
 * 들어온 길을 가릴 수 없어, 예전처럼 보던 자리로 되돌리는 쪽을 남긴다.
 */
export const isSameHistoryEntry = (saved: string | undefined): boolean => {
  const current = currentHistoryEntry();
  if (saved === undefined || current === undefined) return true;
  return saved === current;
};
