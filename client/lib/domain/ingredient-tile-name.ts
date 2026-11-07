/**
 * 성분 타일 목록이 2열에 들어갈지는 브라우저가 가장 긴 낱말의 실제 폭으로 정한다(`IngredientTileGrid`).
 * 그 낱말을 품은 이름만 고르려고 낱말을 나누고 폭을 어림한다. 폭은 이름을 고를 때만 쓴다.
 */

/**
 * `break-keep` 에서 크로미움이 줄을 바꿀 수 있는 자리. 공백 외의 자리에 공백을 넣어 표시한다.
 * 실제 이름 22,036개를 브라우저에서 끊어 본 결과와 같다.
 *
 * - `/` 뒤: 한글 앞에서만. 숫자, 영문, 여는 괄호 앞에서는 끊지 않는다.
 * - `-` 뒤: 영문, 한글, 여는 괄호 앞. 숫자 앞에서는 `-` 앞이 영문이나 숫자일 때만(`C12-15`) 끊고, `피이지-40`은 끊지 않는다.
 * - 닫는 괄호 뒤: 한글과 여는 괄호 앞. 숫자, 영문, `-`, `/` 앞에서는 끊지 않는다.
 * - 한글 뒤: 여는 괄호와 `·` 앞. `·` 뒤: 한글 앞.
 */
const BREAK_AFTER = [
  /(\/)(?=[^ -~])/g,
  /(-)(?=[A-Za-z([]|[^ -~])/g,
  /([A-Za-z0-9]-)(?=\d)/g,
  /([)\]])(?=[가-힣([])/g,
  /([가-힣])(?=[([·])/g,
  /(·)(?=[가-힣])/g,
] as const;

/** 줄을 바꿀 수 없는 조각으로 나눈다. 크로미움의 `break-keep` 을 따른다. */
export const splitUnbreakableWords = (name: string): readonly string[] =>
  BREAK_AFTER.reduce((text, pattern) => text.replace(pattern, "$1 "), name)
    .split(/\s+/)
    .filter(Boolean);

/** Pretendard 600 에서 글자 한 칸의 폭(em). 한글은 모두 같고, 나머지는 종류별 평균이다. */
const charWidthEm = (char: string): number => {
  if (/[0-9]/.test(char)) return 0.6;
  if (/[A-Z]/.test(char)) return 0.67;
  if (/[a-z]/.test(char)) return 0.52;
  if (/[-/()[\],.'·]/.test(char)) return 0.36;
  return 0.864;
};

const wordWidthEm = (word: string): number => Array.from(word).reduce((sum, char) => sum + charWidthEm(char), 0);

const widestWordEm = (words: readonly string[]): number => Math.max(0, ...words.map(wordWidthEm));

/** 이름에서 가장 긴 낱말의 어림 폭(em). */
export const longestWordWidthEm = (name: string): number => widestWordEm(splitUnbreakableWords(name));

/** 사파리는 `-` 뒤에서 끊지 않는다. 그쪽에서 가장 긴 낱말도 놓치지 않게, 공백과 `/` 로만 나눈 폭을 함께 본다. */
const longestTokenWidthEm = (name: string): number => widestWordEm(name.split(/[\s/]+/));

/** 어림 폭의 오차를 덮는 몫. 실제로 가장 긴 낱말이 어림으로 밀려도 후보에 남는다. */
const CANDIDATE_RATIO = 0.85;

const candidatesBy = (names: readonly string[], widthOf: (name: string) => number): readonly string[] => {
  const widest = Math.max(0, ...names.map(widthOf));
  return names.filter((name) => widthOf(name) >= widest * CANDIDATE_RATIO);
};

/**
 * 목록의 2열 여부를 가를 이름만 고른다. 어림으로 가장 길다고 본 이름과 그에 가까운 이름이다.
 * 타일마다 숨겨 두는 글자라, 이름을 모두 넣으면 타일 수의 제곱만큼 늘어난다.
 */
export const pickWidestNames = (names: readonly string[]): readonly string[] => {
  const candidates = new Set([...candidatesBy(names, longestWordWidthEm), ...candidatesBy(names, longestTokenWidthEm)]);
  return names.filter((name) => candidates.has(name));
};
