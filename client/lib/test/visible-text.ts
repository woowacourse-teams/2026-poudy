import { getDefaultNormalizer } from "@testing-library/react";

/**
 * 화면에 그린 문구를 찾을 때 쓰는 비교 방식. 안내 줄과 토스트는 닫는 따옴표와 조사를 폭 없는 단어 결합자(U+2060)로 잇는다
 * (디자인 시스템 keepQuoteWithParticle). 보이는 글자는 같으므로 결합자를 지우고 견준다.
 */
export const VISIBLE_TEXT = {
  normalizer: (text: string) => getDefaultNormalizer()(text).replaceAll("⁠", ""),
};
