package com.poudy.search.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("라틴 낱자 읽기")
class LatinReadingTest {

    @Test
    @DisplayName("검색어의 두문자를 낱자 읽기로 바꾼다")
    void readsAcronymInKeyword() {
        assertThat(LatinReading.ofKeyword("pdrn")).isEqualTo("피디알엔");
        assertThat(LatinReading.ofKeyword("uv")).isEqualTo("유브이");
        assertThat(LatinReading.ofKeyword("spf")).isEqualTo("에스피에프");
    }

    @Test
    @DisplayName("한글 사이에 붙은 낱자를 바꾼다")
    void readsAcronymInsideKoreanName() {
        assertThat(LatinReading.ofName("더마uv365")).isEqualTo("더마유브이365");
        assertThat(LatinReading.ofName("비타c")).isEqualTo("비타씨");
    }

    @Test
    @DisplayName("라틴 구간마다 따로 판단한다")
    void readsEachRunOnItsOwn() {
        assertThat(LatinReading.ofName("블루빈b5-pdrn마일드크림")).isEqualTo("블루빈비5-피디알엔마일드크림");
    }

    @Test
    @DisplayName("상한을 넘는 구간은 낱자로 읽지 않는다")
    void keepsLongRunAsWritten() {
        assertThat(LatinReading.ofKeyword("glycerin")).isEqualTo("glycerin");
        assertThat(LatinReading.ofName("정제수water하이드록사이드")).isEqualTo("정제수water하이드록사이드");
    }

    @Test
    @DisplayName("상한 길이까지만 낱자로 읽는다")
    void readsUpToMaximumAcronymLength() {
        String atLimit = "a".repeat(LatinReading.MAX_ACRONYM_LENGTH);
        String overLimit = "a".repeat(LatinReading.MAX_ACRONYM_LENGTH + 1);

        assertThat(LatinReading.ofKeyword(atLimit)).isEqualTo("에이".repeat(LatinReading.MAX_ACRONYM_LENGTH));
        assertThat(LatinReading.ofKeyword(overLimit)).isEqualTo(overLimit);
    }

    @Test
    @DisplayName("이름 전체가 라틴이면 낱말로 보고 낱자로 읽지 않는다")
    void keepsNameWrittenOnlyInLatin() {
        assertThat(LatinReading.ofName("whey")).isEqualTo("whey");
        assertThat(LatinReading.ofName("zinc")).isEqualTo("zinc");
        assertThat(LatinReading.ofName("dr.g")).isEqualTo("dr.g");
    }

    @Test
    @DisplayName("라틴 문자가 없으면 원래 문자열을 그대로 돌려준다")
    void keepsTextWithoutLatinLetter() {
        assertThat(LatinReading.ofName("피디알엔핑크시카")).isEqualTo("피디알엔핑크시카");
        assertThat(LatinReading.ofKeyword("")).isEmpty();
    }
}
