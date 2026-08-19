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
    @DisplayName("괄호 안의 용량은 절단 기준으로 쓰지 않는다")
    void ignoresVolumeInsidePlanNote() {
        String shared = "[기획] 닥터지 브라이트닝 필링젤 (120+60+세럼2ml) 리필" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("닥터지 브라이트닝 필링젤");
    }

    @Test
    @DisplayName("단위가 붙지 않은 숫자는 제품명의 일부로 남긴다")
    void keepsNumberWithoutUnit() {
        String shared = "[단독] 닥터지 비타 클리어 글루타샷 10+ 흔적 세럼 30ml" + TAIL;

        assertThat(new ShareText(shared).productPhrase()).isEqualTo("닥터지 비타 클리어 글루타샷 10+ 흔적 세럼");
    }

    @Test
    @DisplayName("링크만 공유하면 제품명이 남지 않는다")
    void keepsNothingForLinkOnlyShare() {
        assertThat(new ShareText("https://oy.run/9ADBye4bKEJUpl").productPhrase()).isEmpty();
    }
}
