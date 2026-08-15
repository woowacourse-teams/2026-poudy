package com.poudy.common.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.text.Normalizer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("검색어")
class SearchKeywordTest {

    @Test
    @DisplayName("초성으로 이름을 찾는다")
    void matchesByChosung() {
        assertThat(new SearchKeyword("ㄱㄹㅅㄹ").matches("글리세린")).isTrue();
    }

    @Test
    @DisplayName("이름 중간의 초성도 찾는다")
    void matchesChosungInTheMiddle() {
        assertThat(new SearchKeyword("ㄱㄹㅅㄹ").matches("멘톤글리세린아세탈")).isTrue();
    }

    @Test
    @DisplayName("자모 하나면 같은 자리의 쌍자음도 찾는다")
    void singleLetterFindsDoubleLetter() {
        assertThat(new SearchKeyword("ㅂ").matches("빨간구슬말추출물")).isTrue();
    }

    @Test
    @DisplayName("자모가 둘 이상이면 쌍자음이 정확히 맞아야 한다")
    void severalLettersNeedExactDoubleLetter() {
        assertThat(new SearchKeyword("ㅂㄱ").matches("빨간구슬말추출물")).isFalse();
        assertThat(new SearchKeyword("ㅃㄱ").matches("빨간구슬말추출물")).isTrue();
    }

    @Test
    @DisplayName("쌍자음을 직접 치면 단자음은 걸리지 않는다")
    void doubleLetterDoesNotMatchSingleLetter() {
        assertThat(new SearchKeyword("ㅃ").matches("바보추출물")).isFalse();
        assertThat(new SearchKeyword("ㅃ").matches("빨간구슬말추출물")).isTrue();
    }

    @Test
    @DisplayName("한글이 아닌 문자에서 초성이 끊긴다")
    void breaksAtNonSyllable() {
        assertThat(new SearchKeyword("ㅈㅅㅎㅇ").matches("적색104호의(1)")).isFalse();
        assertThat(new SearchKeyword("ㅈㅅ").matches("적색104호의(1)")).isTrue();
        assertThat(new SearchKeyword("ㅎㅇ").matches("적색104호의(1)")).isTrue();
    }

    @Test
    @DisplayName("끊기지 않은 구간 안에서는 그대로 찾는다")
    void matchesInsideOneRun() {
        assertThat(new SearchKeyword("ㄱㄹㅅㄹ").matches("메틸실란올피이지-7글리세릴코코에이트")).isTrue();
    }

    @Test
    @DisplayName("영문명은 초성 검색에 걸리지 않는다")
    void doesNotMatchEnglishNameByChosung() {
        assertThat(new SearchKeyword("ㄱㄹㅅㄹ").matches("Glycerin")).isFalse();
    }

    @Test
    @DisplayName("초성이 아닌 검색어는 부분 일치로 찾는다")
    void matchesBySubstring() {
        assertThat(new SearchKeyword("글리세").matches("멘톤글리세린아세탈")).isTrue();
        assertThat(new SearchKeyword("GLYCERIN").matches("Glycerin")).isTrue();
    }

    @Test
    @DisplayName("자모가 분해된 검색어도 찾는다")
    void matchesDecomposedKeyword() {
        String decomposed = Normalizer.normalize("글리", Normalizer.Form.NFD);

        assertThat(new SearchKeyword(decomposed).matches("글리세린")).isTrue();
    }

    @Test
    @DisplayName("분해된 자모로 친 초성도 초성 검색으로 받는다")
    void matchesInitialJamoKeyword() {
        assertThat(new SearchKeyword("ᄀᄅᄉᄅ").matches("글리세린")).isTrue();
    }

    @Test
    @DisplayName("앞뒤 공백은 검색어에서 지운다")
    void stripsSurroundingSpaces() {
        assertThat(new SearchKeyword("  글리세린  ").matches("글리세린")).isTrue();
    }
}
