package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.search.domain.NameMatch;
import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드")
class BrandTest {

    @Test
    @DisplayName("영문명과 이미지가 없으면 null로 둔다")
    void keepsMissingOptionalTextAsNull() {
        Brand brand = new Brand(1L, "닥터지", null, null);

        assertThat(brand.englishName()).isNull();
        assertThat(brand.imageUrl()).isNull();
    }

    @Test
    @DisplayName("영문명과 이미지가 있으면 그대로 둔다")
    void keepsOptionalText() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", "https://cdn.example.com/brands/1/image.png");

        assertThat(brand.englishName()).isEqualTo("Dr.G");
        assertThat(brand.imageUrl()).isEqualTo("https://cdn.example.com/brands/1/image.png");
    }

    @Test
    @DisplayName("ID가 같으면 같은 브랜드이다")
    void comparesById() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", null);
        Brand renamed = new Brand(1L, "닥터지 리뉴얼", null, null);
        Brand differentBrand = new Brand(2L, "닥터지", "Dr.G", null);

        assertThat(brand).isEqualTo(renamed).hasSameHashCodeAs(renamed).isNotEqualTo(differentBrand);
    }

    @Test
    @DisplayName("검색어를 한글명과 영문명에 모두 매칭한다")
    void matchesKeywordAgainstKoreanAndEnglishNames() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", null);

        assertThat(brand.matchKeyword(new SearchKeyword("닥터")))
                .extracting(NameRank::match)
                .isEqualTo(NameMatch.PREFIX);
        assertThat(brand.matchKeyword(new SearchKeyword("dr.g")))
                .extracting(NameRank::match)
                .isEqualTo(NameMatch.EXACT);
        assertThat(brand.matchKeyword(new SearchKeyword("메디큐브"))).isEqualTo(NameRank.NONE);
    }
}
