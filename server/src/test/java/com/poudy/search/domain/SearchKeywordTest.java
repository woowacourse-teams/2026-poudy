package com.poudy.search.domain;

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
    @DisplayName("여러 이름 중 정확히 같은 이름이 있는지 판단한다")
    void matchesAnyNameExactly() {
        SearchKeyword keyword = new SearchKeyword("닥터지");

        assertThat(keyword.matchesExactly("메디큐브", "닥터지", null)).isTrue();
        assertThat(keyword.matchesExactly("닥터지랩", "Dr.G", null)).isFalse();
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

    @Test
    @DisplayName("붙여 쓴 검색어가 띄어 쓴 이름을 찾는다")
    void ignoresSpacesInName() {
        assertThat(new SearchKeyword("리나칸투스콤무니스").matches("리나칸투스 콤무니스추출물")).isTrue();
    }

    @Test
    @DisplayName("띄어 쓴 검색어가 붙여 쓴 이름을 찾는다")
    void ignoresSpacesInKeyword() {
        assertThat(new SearchKeyword("글리 세린").matches("글리세린")).isTrue();
    }

    @Test
    @DisplayName("초성도 공백을 넘어 이어진다")
    void chosungIgnoresSpaces() {
        assertThat(new SearchKeyword("ㄹㄴㅋㅌㅅㅋㅁㄴㅅ").matches("리나칸투스 콤무니스추출물")).isTrue();
    }

    @Test
    @DisplayName("줄바꿈 없는 공백도 공백으로 본다")
    void ignoresNonBreakingSpace() {
        assertThat(new SearchKeyword("rosiglitazonemaleate").matches("Rosiglitazone\u00A0Maleate")).isTrue();
    }

    @Test
    @DisplayName("공백뿐인 검색어는 아무것도 찾지 않는다")
    void spaceOnlyKeywordMatchesNothing() {
        assertThat(new SearchKeyword("\u00A0").matches("글리세린")).isFalse();
    }

    @Test
    @DisplayName("라틴 두문자 검색어가 한글 음차 이름을 찾는다")
    void matchesKoreanReadingByLatinKeyword() {
        assertThat(new SearchKeyword("pdrn").matches("피디알엔 핑크 시카 수딩 토너")).isTrue();
        assertThat(new SearchKeyword("uv").matches("유브이 365 선크림")).isTrue();
    }

    @Test
    @DisplayName("한글 음차 검색어가 라틴 두문자 이름을 찾는다")
    void matchesLatinAcronymByKoreanReadingKeyword() {
        assertThat(new SearchKeyword("피디알엔").matches("PDRN 핑크 시카 수딩 토너")).isTrue();
        assertThat(new SearchKeyword("에스피에프").matches("데일리 선크림 SPF50+ PA++++")).isTrue();
        assertThat(new SearchKeyword("비타씨").matches("더마UV365 비타C 광채수분 선크림")).isTrue();
    }

    @Test
    @DisplayName("낱자 읽기가 긴 영문명의 부분 일치를 밀어내지 않는다")
    void keepsSubstringMatchOnLongEnglishName() {
        assertThat(new SearchKeyword("pa").matches("Ethylhexyl Palmitate")).isTrue();
        assertThat(new SearchKeyword("uv").matches("Uvinul A Plus")).isTrue();
    }

    @Test
    @DisplayName("표기만 다른 이름은 정확히 같은 이름으로 본다")
    void treatsReadingAsExactName() {
        assertThat(new SearchKeyword("피에이치 컨디션 토너").matchesExactly("PH 컨디션 토너", null)).isTrue();
        assertThat(new SearchKeyword("pdrn").matchesExactly("피디알엔", null)).isTrue();
    }

    @Test
    @DisplayName("이름 전체가 라틴이면 낱말로 보고 음차로 맞추지 않는다")
    void doesNotReadNameWrittenOnlyInLatin() {
        assertThat(new SearchKeyword("피디알엔").matchesExactly("PDRN", null)).isFalse();
        assertThat(new SearchKeyword("더블유").matches("Whey")).isFalse();
    }

    @Test
    @DisplayName("이름으로 바로 걸린 결과가 음차로 걸린 결과보다 앞선다")
    void ranksDirectMatchBeforeReadingMatch() {
        SearchKeyword keyword = new SearchKeyword("씨");
        NameRank direct = NameRank.best(SearchableText.formsOf("씨솔트"), keyword);
        NameRank byReading = NameRank.best(SearchableText.formsOf("C20-30글라이콜아이소스테아레이트"), keyword);

        assertThat(direct.match()).isEqualTo(NameMatch.PREFIX);
        assertThat(byReading.match()).isEqualTo(NameMatch.PREFIX);
        assertThat(direct.isBetterThan(byReading)).isTrue();
    }

    @Test
    @DisplayName("초성 검색도 낱자 읽기까지 닿는다")
    void matchesReadingByChosung() {
        assertThat(new SearchKeyword("ㅍㄷㅇㅇ").matches("PDRN 핑크 시카 수딩 토너")).isTrue();
    }

    @Test
    @DisplayName("일반 문자열이 일치한 원문 반열림 구간을 반환한다")
    void findsOriginalRange() {
        TextMatch match = matchOf("가지", "가지추출물");

        assertThat(match.text()).isEqualTo("가지추출물");
        assertThat(match.range().startIndex()).isZero();
        assertThat(match.range().endIndexExclusive()).isEqualTo(2);
    }

    @Test
    @DisplayName("공백을 제거해 비교해도 원문의 공백을 포함한 구간을 반환한다")
    void findsRangeAcrossSpaces() {
        TextMatch match = matchOf("스네일토너", "블랙 스네일 토너");

        assertThat(match.range().startIndex()).isEqualTo(3);
        assertThat(match.range().endIndexExclusive()).isEqualTo(9);
        assertThat(match.text().substring(match.range().startIndex(), match.range().endIndexExclusive()))
            .isEqualTo("스네일 토너");
    }

    @Test
    @DisplayName("초성 검색이 일치한 한글 음절 구간을 반환한다")
    void findsChosungRange() {
        TextMatch match = matchOf("ㅍㅌㄴ", "메틸판테놀에스터");

        assertThat(match.range().startIndex()).isEqualTo(2);
        assertThat(match.range().endIndexExclusive()).isEqualTo(5);
    }

    @Test
    @DisplayName("라틴 낱자 읽기와 그 초성이 일치한 원문 라틴 구간을 반환한다")
    void findsLatinReadingRange() {
        TextMatch reading = matchOf("피디알엔", "PDRN 핑크 시카");
        TextMatch chosung = matchOf("ㅍㄷㅇㅇ", "PDRN 핑크 시카");

        assertThat(reading.range().startIndex()).isZero();
        assertThat(reading.range().endIndexExclusive()).isEqualTo(4);
        assertThat(chosung.range().startIndex()).isZero();
        assertThat(chosung.range().endIndexExclusive()).isEqualTo(4);
    }

    @Test
    @DisplayName("NFC 정규화 뒤에도 분해된 원문의 전체 구간을 반환한다")
    void findsDecomposedOriginalRange() {
        String decomposed = Normalizer.normalize("글리", Normalizer.Form.NFD);

        TextMatch match = matchOf("글리", decomposed);

        assertThat(match.range().startIndex()).isZero();
        assertThat(match.range().endIndexExclusive()).isEqualTo(decomposed.length());
    }

    private static TextMatch matchOf(String keyword, String text) {
        return TextMatch.best(SearchableText.formsOf(text), new SearchKeyword(keyword)).orElseThrow();
    }
}
