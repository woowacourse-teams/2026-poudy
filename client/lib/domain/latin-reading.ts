/**
 * 라틴 낱자를 한글 읽기로 옮긴다. 서버 `com.poudy.search.domain.LatinReading` 을
 * 옮긴 것이다. `PDRN` 을 `피디알엔` 으로 읽어 두어 두 표기가 서로 걸리게 한다.
 *
 * 목이 실제 서버와 다르게 걸러 내면 화면을 붙여 볼 때 결과가 어긋난다. 값과 규칙을
 * 그대로 옮겨 두고, 서버가 바뀌면 이쪽도 함께 고친다.
 */
const LETTER_READINGS = [
  "에이",
  "비",
  "씨",
  "디",
  "이",
  "에프",
  "지",
  "에이치",
  "아이",
  "제이",
  "케이",
  "엘",
  "엠",
  "엔",
  "오",
  "피",
  "큐",
  "알",
  "에스",
  "티",
  "유",
  "브이",
  "더블유",
  "엑스",
  "와이",
  "제트",
] as const;

/**
 * 낱자로 읽을 라틴 구간의 최대 길이.
 *
 * 이보다 길면 단어로 보고 그대로 둔다. `Panthenol` 을 낱자로 읽으면 뜻이 없는 소리가
 * 되고, `Whey` 나 `Zinc` 같은 짧은 단어가 두문자로 오독되는 것도 이 선이 막는다.
 */
const MAX_ACRONYM_LENGTH = 4;

const FIRST_LETTER = "a".charCodeAt(0);
const LAST_LETTER = "z".charCodeAt(0);
const FIRST_SYLLABLE = "가".charCodeAt(0);
const LAST_SYLLABLE = "힣".charCodeAt(0);

const isLetter = (character: string): boolean => {
  const code = character.charCodeAt(0);
  return code >= FIRST_LETTER && code <= LAST_LETTER;
};

const isSyllable = (character: string): boolean => {
  const code = character.charCodeAt(0);
  return code >= FIRST_SYLLABLE && code <= LAST_SYLLABLE;
};

/** 이어진 라틴 낱자 덩어리마다 나눈다. 사이에 낀 다른 글자는 그대로 남는다. */
const runs = (text: string): readonly string[] => text.split(/([a-z]+)/).filter((part) => part.length > 0);

const read = (normalized: string): string => {
  if (![...normalized].some(isLetter)) return normalized;

  return runs(normalized)
    .map((run) => {
      if (!isLetter(run[0])) return run;
      // 긴 덩어리는 단어라 그대로 둔다. 짧은 것만 낱자로 읽는다.
      if (run.length > MAX_ACRONYM_LENGTH) return run;

      return [...run].map((letter) => LETTER_READINGS[letter.charCodeAt(0) - FIRST_LETTER]).join("");
    })
    .join("");
};

/** 검색어를 읽는다. 조건 없이 읽어 `pdrn` 으로도 `피디알엔` 으로도 찾게 한다. */
export const readKeyword = (normalized: string): string => read(normalized);

/**
 * 이름을 읽는다. 한글이 섞여 있을 때만 읽는다.
 *
 * 순수 영문 이름까지 읽으면 `Whey` 가 `더블유에이치이와이` 가 되어 엉뚱한 검색어에
 * 걸린다. 한글이 섞인 이름은 그 안의 라틴 조각이 두문자일 때가 많아 읽어 둔다.
 */
export const readName = (normalized: string): string => {
  if (![...normalized].some(isSyllable)) return normalized;

  return read(normalized);
};
