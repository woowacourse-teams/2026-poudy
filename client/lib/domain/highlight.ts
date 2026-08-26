import { keepIf, pick } from "./optional";

/**
 * 검색어와 맞는 자리를 찾아 글자를 토막으로 나눈다.
 *
 * 서버는 한글 이름과 영문 이름을 합쳐 훑으므로 영문만 맞아도 결과에 뜬다. 그때 한글
 * 이름에는 맞는 자리가 없어 토막이 하나만 나온다. 없는 자리를 억지로 칠하지 않는다.
 *
 * 맞는 자리가 여럿이면 모두 나눈다. 같은 토막이 되풀이되는 이름이 있다.
 */
export type HighlightPart = {
  readonly text: string;
  readonly matched: boolean;
};

/**
 * 맞는 자리의 시작 위치를 앞에서부터 모은다.
 *
 * 글자마다 그 자리에서 검색어가 시작하는지만 본다. 앞에서부터 훑으므로 위치는 이미
 * 차례대로 나온다. 되풀이되는 자리도 빠짐없이 걸린다.
 *
 * 겹쳐 걸리는 자리는 세지 않는다. `설설` 에서 `설설` 을 찾으면 0 만 남고 1 은 앞의
 * 것에 이미 먹혔다. 그래야 토막이 서로 겹치지 않는다.
 */
const matchStarts = (haystack: string, needle: string): readonly number[] =>
  [...haystack]
    .flatMap((_, at) => keepIf(haystack.startsWith(needle, at), at))
    .filter(
      // 앞의 것과 겹치면 버린다. 남은 것끼리는 서로 needle 길이만큼 떨어져 있다.
      (at, order, all) => all.slice(0, order).every((earlier) => at >= earlier + needle.length),
    );

/** 빈 토막은 두지 않는다. 맞은 자리가 맨 앞이나 맨 뒤면 그쪽에 남는 글자가 없다. */
const plain = (text: string): readonly HighlightPart[] => keepIf(text.length > 0, { text, matched: false });

export const splitByKeyword = (text: string, keyword: string): readonly HighlightPart[] => {
  const needle = keyword.trim().toLowerCase();
  const starts = pick(needle.length === 0, [] as readonly number[], matchStarts(text.toLowerCase(), needle));

  return pick(starts.length === 0, [{ text, matched: false }] as readonly HighlightPart[], [
    /* 맞은 자리마다 그 앞에 남은 글자와 맞은 글자를 차례로 놓는다. */
    ...starts.flatMap((at, order) => [
      ...plain(text.slice(pick(order === 0, 0, starts[order - 1] + needle.length), at)),
      { text: text.slice(at, at + needle.length), matched: true },
    ]),
    /* 마지막 자리 뒤에 남은 글자를 붙인다. */
    ...plain(text.slice(starts[starts.length - 1] + needle.length)),
  ]);
};

/**
 * 흐리게 할 자리가 있는지. 맞는 자리가 하나도 없으면 흐리게 하지 않는다.
 *
 * 서버가 영문 이름까지 훑어 뜬 결과는 한글 이름에 맞는 자리가 없다. 그때 이름 전체를
 * 흐리게 두면 왜 떴는지도 모른 채 읽기만 나빠진다. 그런 줄은 평소대로 진하게 둔다.
 */
export const hasMatch = (parts: readonly HighlightPart[]): boolean => parts.some((part) => part.matched);
