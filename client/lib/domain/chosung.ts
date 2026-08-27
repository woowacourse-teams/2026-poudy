/**
 * 초성 검색. 서버 `com.poudy.search.domain.Chosung` 의 규칙을 옮긴 것이다.
 *
 * 목이 실제 서버와 다르게 걸러 내면 화면을 붙여 볼 때 결과가 어긋난다. 값과 규칙을
 * 그대로 옮겨 두고, 서버가 바뀌면 이쪽도 함께 고친다.
 */
import { readKeyword, readName } from "./latin-reading";

const LETTERS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const DOUBLE_LETTERS = "ㄲㄸㅃㅆㅉ";
const FOLDED_LETTERS = "ㄱㄷㅂㅅㅈ";

const FIRST_SYLLABLE = "가".charCodeAt(0);
const LAST_SYLLABLE = "힣".charCodeAt(0);
const LETTERS_PER_CHOSUNG = 588;

/** 한글 음절은 초성으로, 나머지 글자는 공백으로 바꾼다. 자리 수는 그대로 둔다. */
export const toChosung = (text: string): string =>
  [...text]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < FIRST_SYLLABLE || code > LAST_SYLLABLE) return " ";

      return LETTERS[Math.floor((code - FIRST_SYLLABLE) / LETTERS_PER_CHOSUNG)];
    })
    .join("");

/** 쌍자음을 홑자음으로 접는다. `ㄱ` 하나로 `까페` 도 찾게 한다. */
const fold = (text: string): string =>
  [...text]
    .map((letter) => {
      const at = DOUBLE_LETTERS.indexOf(letter);
      if (at < 0) return letter;

      return FOLDED_LETTERS[at];
    })
    .join("");

/** 검색어가 초성만으로 쓰였는지. 빈 값은 초성으로 보지 않는다. */
export const isChosung = (text: string): boolean => text.length > 0 && [...text].every((c) => LETTERS.includes(c));

/**
 * 낱자 하나로 찾을 때는 쌍자음을 접어 견준다.
 * 쌍자음을 직접 친 경우(`ㄲ`)는 접지 않아 그 자음만 걸린다.
 */
const foldsDoubleLetter = (searched: string): boolean => searched.length === 1 && !DOUBLE_LETTERS.includes(searched);

/**
 * 이름이 검색어에 걸리는지. 여러 이름을 함께 넘기면 그중 하나만 걸려도 참이다.
 *
 * 검색어가 초성이면 초성끼리 견주고, 아니면 글자 그대로 견주되 라틴 낱자를 한글로
 * 읽은 것끼리도 함께 본다. `PDRN` 을 `피디알엔` 으로도 찾을 수 있어야 한다.
 */
export const matchesKeyword = (keyword: string, ...names: readonly (string | undefined)[]): boolean => {
  const searched = keyword.trim().toLowerCase();
  if (searched.length === 0) return true;

  const joined = names.filter(Boolean).join(" ");

  if (isChosung(searched)) {
    const chosung = toChosung(joined);
    if (foldsDoubleLetter(searched)) return fold(chosung).includes(fold(searched));

    return chosung.includes(searched);
  }

  const normalized = joined.toLowerCase();
  if (normalized.includes(searched)) return true;

  /* 원표기로 걸리지 않으면 읽은 것끼리 다시 본다. 검색어와 이름 어느 쪽이 라틴이어도 잇는다. */
  return readName(normalized).includes(readKeyword(searched));
};
