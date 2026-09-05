/** 서버 컴포넌트가 받는 검색 조건. Next 가 약속으로 넘겨 준다. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 같은 키가 여러 번 온 조건은 배열로 들어온다. 둘 다 같은 모양으로 편다. */
const listOf = (value: string | readonly string[]): readonly string[] => {
  if (Array.isArray(value)) return value;
  return [value as string];
};

/**
 * `parseFilter` 가 읽을 수 있는 모양으로 옮긴다.
 * 조건을 읽는 규칙은 클라이언트와 같아야 하므로 여기서는 모양만 바꾼다.
 */
export const toSearchParams = (entries: Record<string, string | string[] | undefined>): URLSearchParams =>
  new URLSearchParams(
    Object.entries(entries)
      .filter(([, value]) => value !== undefined)
      .flatMap(([key, value]) => listOf(value!).map((one): [string, string] => [key, one])),
  );
