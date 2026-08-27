import { keepIf, pick } from "./optional";

/**
 * 검색어와 맞는 자리를 찾아 글자를 토막으로 나눈다.
 *
 * 맞는 자리가 여럿이면 모두 나눈다. 같은 토막이 되풀이되는 이름이 있다.
 */
export type HighlightPart = {
  readonly text: string;
  readonly matched: boolean;
};

/**
 * 서버가 짚어 준 일치 범위.
 *
 * `startIndex` 는 포함, `endIndexExclusive` 는 제외다. 둘 다 UTF-16 인덱스라
 * 그대로 `slice` 에 넣는다.
 */
export type MatchRange = {
  readonly text: string;
  readonly startIndex: number;
  readonly endIndexExclusive: number;
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
 * 범위가 글자 안에 온전히 들어오는지.
 *
 * 서버와 클라이언트가 같은 글자를 보고 있다는 보장이 없다. 계약이 어긋나거나 목이
 * 낡으면 범위가 글자 밖을 가리킬 수 있는데, 그대로 `slice` 하면 엉뚱한 자리가
 * 진해지거나 빈 토막이 생긴다. 그런 범위는 없는 것으로 본다.
 */
const inBounds = (range: MatchRange): boolean =>
  Number.isInteger(range.startIndex) &&
  Number.isInteger(range.endIndexExclusive) &&
  range.startIndex >= 0 &&
  range.startIndex < range.endIndexExclusive &&
  range.endIndexExclusive <= range.text.length;

/**
 * 서버가 짚어 준 범위로 글자를 토막 낸다.
 *
 * 초성이나 음차로 찾은 줄은 검색어 글자가 이름 안에 그대로 있지 않다. `ㅍㅌㄴ` 으로
 * 판테놀을 찾은 줄이 그렇다. 클라이언트가 다시 찾아 나서면 못 찾아 아무 자리도
 * 진해지지 않으니, 서버가 이미 아는 자리를 그대로 쓴다.
 *
 * 이명으로 걸린 줄은 대표 이름이 아니라 실제로 맞은 이름을 짚는다. 범위도 그 글자
 * 기준이라 `match.text` 를 함께 넘겨받아 그 위에서 자른다.
 */
export const splitByRange = (range: MatchRange): readonly HighlightPart[] =>
  pick(!inBounds(range), [{ text: range.text, matched: false }] as readonly HighlightPart[], [
    ...plain(range.text.slice(0, range.startIndex)),
    { text: range.text.slice(range.startIndex, range.endIndexExclusive), matched: true },
    ...plain(range.text.slice(range.endIndexExclusive)),
  ]);

/**
 * 흐리게 할 자리가 있는지. 맞는 자리가 하나도 없으면 흐리게 하지 않는다.
 *
 * 범위가 계약을 벗어나 토막을 내지 못한 줄이 그렇다. 그때 이름 전체를 흐리게 두면
 * 왜 떴는지도 모른 채 읽기만 나빠진다. 그런 줄은 평소대로 진하게 둔다.
 */
export const hasMatch = (parts: readonly HighlightPart[]): boolean => parts.some((part) => part.matched);
