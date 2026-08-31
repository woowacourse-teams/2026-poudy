package com.poudy.share.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@DisplayName("공유 텍스트 정제")
class ShareTextTest {

    private static final String TAIL = " 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/9ADBye4bKEJUpl";

    @ParameterizedTest(name = "{1}")
    @CsvSource(delimiter = '|', value = {
            "[화잘먹/단독기획]폴라초이스 스킨 퍼펙팅 바하 리퀴드 엑스폴리언트 118ml 더블 기획"
                + "|폴라초이스 스킨 퍼펙팅 바하 리퀴드 엑스폴리언트",
            "[화잘먹/저자극] 닥터지 브라이트닝 필링젤 기획 (120+60+세럼2ml)|닥터지 브라이트닝 필링젤",
            "[1+1/수분진정] 닥터지 레드 블레미쉬 클리어 히알 시카 수딩 세럼 50ml 리필 기획 (+50ml 리필)"
                + "|닥터지 레드 블레미쉬 클리어 히알 시카 수딩 세럼",
            "[튜브타입/단독기획] 닥터지 레드 블레미쉬 클리어 수딩크림 EX 70ml 튜브 기획 (+30ml+세럼10ml*2ea)"
                + "|닥터지 레드 블레미쉬 클리어 수딩크림 EX",
            "[흔적미백]메디큐브 PDRN 핑크 시카 수딩 토너 250ml|메디큐브 PDRN 핑크 시카 수딩 토너"})
    @DisplayName("실제 공유 텍스트에서 브랜드와 제품명만 남긴다")
    void keepsProductPhrase(String shared, String expected) {
        assertThat(new ShareText(shared + TAIL).productPhrase()).isEqualTo(expected);
    }

    @Test
    @DisplayName("링크가 있는지 확인한다")
    void findsLink() {
        assertThat(new ShareText("제품" + TAIL).hasLink()).isTrue();
        assertThat(new ShareText("닥터지 레드 블레미쉬 클리어 수딩크림 EX").hasLink()).isFalse();
    }

    @Test
    @DisplayName("앱 공유 제목의 줄바꿈 없는 공백을 일반 공백으로 정규화한다")
    void normalizesNonBreakingSpaces() {
        String shared = "[9월올영픽/헬로키티]\u00A0에스네이처\u00A0아쿠아 오아시스 토너 300ml 기획" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("에스네이처 아쿠아 오아시스 토너");
    }

    @Test
    @DisplayName("괄호 안의 용량은 절단 기준으로 쓰지 않는다")
    void ignoresVolumeInsidePlanNote() {
        String shared = "[기획] 닥터지 브라이트닝 필링젤 (120+60+세럼2ml) 리필" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("닥터지 브라이트닝 필링젤");
    }

    @Test
    @DisplayName("괄호로 감싼 제품 버전 기호는 제품명에 남긴다")
    void keepsParenthesizedVersionSign() {
        String shared = "라로슈포제 에빠끌라 K(+) 토너 200ml (지성 피부)" + TAIL;

        assertThat(new ShareText(shared).productPhrases())
            .containsExactly("라로슈포제 에빠끌라 K+ 토너", "라로슈포제 에빠끌라 K 토너");
    }

    @Test
    @DisplayName("단위가 붙지 않은 숫자는 제품명의 일부로 남긴다")
    void keepsNumberWithoutUnit() {
        String shared = "[단독] 닥터지 비타 클리어 글루타샷 10+ 흔적 세럼 30ml" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("닥터지 비타 클리어 글루타샷 10+ 흔적 세럼");
    }

    @ParameterizedTest(name = "{1}")
    @CsvSource(delimiter = '|', value = {
            "[1+1] 메디힐 비타민씨 브라이트닝 세럼 40+40ml 더블 기획|메디힐 비타민씨 브라이트닝 세럼",
            "[한정기획] 메디힐 마데카소사이드 수분 선세럼 흔적 리페어 50+50+15g 기획"
                + "|메디힐 마데카소사이드 수분 선세럼 흔적 리페어"})
    @DisplayName("합산 용량은 첫 번째 숫자부터 털어 낸다")
    void trimsCombinedVolume(String shared, String expected) {
        assertThat(new ShareText(shared + TAIL).productPhrase()).isEqualTo(expected);
    }

    @Test
    @DisplayName("용량보다 앞에 남은 묶음 수량은 기획 낱말과 함께 털어 낸다")
    void trimsBundleCountBeforePlanWord() {
        String shared = "[수분생기] 라운드랩 자작나무 수분 토너 1+1 기획 (300ml+300ml)" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("라운드랩 자작나무 수분 토너");
    }

    @Test
    @DisplayName("NEW가 든 선두 태그는 제품 버전 표식으로 남긴다")
    void keepsNewProductMarker() {
        String shared = "[NEW/단독기획] 토리든 다이브인 저분자 히알루론산 수딩 크림 100ml" + TAIL;

        assertThat(new ShareText(shared).productPhrase())
            .isEqualTo("[NEW] 토리든 다이브인 저분자 히알루론산 수딩 크림");
    }

    @Test
    @DisplayName("기획 낱말을 털어 내기 전 구절도 후보로 남긴다")
    void keepsPhraseBeforeTrimmingPlanWords() {
        String shared = "[단독] 아비브 어성초 크림 카밍 튜브 기획" + TAIL;

        assertThat(new ShareText(shared).productPhrases())
            .containsExactly("아비브 어성초 크림 카밍 튜브 기획", "아비브 어성초 크림 카밍");
    }

    @Test
    @DisplayName("털어 낼 기획 낱말이 없으면 후보는 하나다")
    void keepsSinglePhraseWithoutPlanWords() {
        String shared = "[단독] 메디큐브 PDRN 핑크 시카 수딩 토너 250ml" + TAIL;

        assertThat(new ShareText(shared).productPhrases()).containsExactly("메디큐브 PDRN 핑크 시카 수딩 토너");
    }

    @ParameterizedTest(name = "{1}")
    @CsvSource(delimiter = '|', value = {
            "[수분진정/세럼증정] 닥터지 레드블레미쉬 클리어 수딩크림 EX 70ml기획 (+30ml+세럼10ml*2ea)"
                + "|닥터지 레드블레미쉬 클리어 수딩크림 EX",
            "[온라인단독/대용량] 에스트라 아토베리어365 크림 80mlX3 한정기획|에스트라 아토베리어365 크림",
            "[온라인 단독기획]바이오더마 하이드라비오 세럼 더블기획|바이오더마 하이드라비오 세럼",
            "[8월올영픽]브링그린 징크테카 트러블 세럼 대용량 기획|브링그린 징크테카 트러블 세럼",
            "[약산성저자극] 아비브 아크네 폼 클렌저 어성초 폼 대용량 250ml|아비브 아크네 폼 클렌저 어성초 폼"})
    @DisplayName("용량과 기획 낱말이 붙어 와도 제품명만 남긴다")
    void keepsProductPhraseWithAttachedPlanTokens(String shared, String expected) {
        assertThat(new ShareText(shared + TAIL).productPhrase()).isEqualTo(expected);
    }

    @Test
    @DisplayName("링크만 공유하면 제품명이 남지 않는다")
    void keepsNothingForLinkOnlyShare() {
        assertThat(new ShareText("https://oy.run/9ADBye4bKEJUpl").productPhrase()).isEmpty();
    }
}
