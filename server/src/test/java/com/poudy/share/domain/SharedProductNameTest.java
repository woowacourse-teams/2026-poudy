package com.poudy.share.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("공유 제품명 분리")
class SharedProductNameTest {

    private static final Brands BRANDS = new Brands(
            List.of(
                    new Brand(1L, "닥터지", "Dr.G", null),
                    new Brand(2L, "메디큐브", null, null),
                    new Brand(3L, "다 브랜드", null, null)));

    @Test
    @DisplayName("카탈로그 제품명에는 브랜드가 없으므로 브랜드를 떼어 낸다")
    void splitsBrand() {
        SharedProductName name = SharedProductName.of("닥터지 레드 블레미쉬 클리어 수딩크림 EX", BRANDS);

        assertThat(name.brand()).contains(new Brand(1L, "닥터지", "Dr.G", null));
        assertThat(name.keyword()).isEqualTo("레드 블레미쉬 클리어 수딩크림 EX");
    }

    @Test
    @DisplayName("공백이 들어간 브랜드 이름도 떼어 낸다")
    void splitsBrandWithSpace() {
        SharedProductName name = SharedProductName.of("다 브랜드 블랙 스네일 토너", BRANDS);

        assertThat(name.brand()).map(Brand::id).contains(3L);
        assertThat(name.keyword()).isEqualTo("블랙 스네일 토너");
    }

    @Test
    @DisplayName("취급하지 않는 브랜드면 이름을 그대로 둔다")
    void keepsUnknownBrand() {
        SharedProductName name = SharedProductName.of("폴라초이스 스킨 퍼펙팅 바하 리퀴드 엑스폴리언트", BRANDS);

        assertThat(name.brand()).isEmpty();
        assertThat(name.keyword()).isEqualTo("폴라초이스 스킨 퍼펙팅 바하 리퀴드 엑스폴리언트");
    }

    @Test
    @DisplayName("브랜드만 공유하면 제품명이 남지 않는다")
    void hasNoKeywordForBrandOnlyShare() {
        assertThat(SharedProductName.of("메디큐브", BRANDS).isEmpty()).isTrue();
    }

    @Test
    @DisplayName("축약 검색어는 뒤 낱말부터 덜어 내며 넓은 순서로 준다")
    void shortensFromTail() {
        SharedProductName name = SharedProductName.of("메디큐브 PDRN 핑크 시카 수딩 토너", BRANDS);

        assertThat(name.shortenedKeywords())
                .containsExactly("PDRN 핑크 시카 수딩", "PDRN 핑크 시카", "PDRN 핑크");
    }

    @Test
    @DisplayName("하한 아래로는 축약하지 않는다")
    void stopsShorteningAtLimit() {
        assertThat(SharedProductName.of("닥터지 수딩 크림", BRANDS).shortenedKeywords()).isEmpty();
    }
}
