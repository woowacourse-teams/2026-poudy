/** 브랜드 디렉터리의 초성 색인. 디자인의 레일과 같은 순서다. */
export const CHOSEONG_INDEX = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

// 한글 음절은 가(0xAC00)부터 588 자마다 초성이 바뀐다.
const FIRST_SYLLABLE = 0xac00;
const LAST_SYLLABLE = 0xd7a3;
const SYLLABLES_PER_CHOSEONG = 588;

const CHOSEONG_TABLE = [
  "ㄱ",
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅂ",
  "ㅅ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

/**
 * 첫 글자의 초성을 돌려준다. 된소리는 예사소리로 묶어 ㄲ 을 ㄱ 으로 본다.
 * 한글이 아니면 빈 문자열을 준다.
 */
export const choseongOf = (name: string): string => {
  const code = name.trim().charCodeAt(0);
  if (!(code >= FIRST_SYLLABLE && code <= LAST_SYLLABLE)) return "";

  const index = Math.floor((code - FIRST_SYLLABLE) / SYLLABLES_PER_CHOSEONG);
  return CHOSEONG_TABLE[index] ?? "";
};
