package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.ProductSuggestion;
import com.poudy.product.domain.RelatedKeyword;
import java.text.Normalizer;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql("/db/related-keyword-test-data.sql")
@DisplayName("제품명 자동완성 DB 조회")
class RelatedKeywordsTest {
    @Autowired
    private ProductQueryRepository queries;
    @Autowired
    private ProductRepository products;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("제품 검색 결과의 제품을 같은 순서로 저장된 제품명 그대로 반환한다")
    void followsSearchResults() {
        List<String> searched = queries.suggest("연관토너", 1, 20).items().stream().map(ProductSuggestion::name).toList();

        assertThat(keywords("연관토너", 20)).isEqualTo(searched).contains("ＳＯＯＴＨ 연관토너", "SOOTH 연관토너");
        assertThat(keywords("수분 연관토너", 100)).containsExactly("수분 연관토너", "수분 연관토너 대용량");
    }

    @Test
    @DisplayName("검색 결과 순서대로 요청한 개수만 반환한다")
    void limitsInSearchOrder() {
        assertThat(keywords("연관토너", 5)).containsExactly(
            "수분 연관토너",
            "진정 연관토너",
            "1+1 연관토너",
            "[기획] 연관토너",
            "😀보습 연관토너"
        );
    }

    @Test
    @DisplayName("브랜드로 맞은 제품은 브랜드 제품명으로 보여 준다")
    void prefixesBrandWhenBrandMatched() {
        assertThat(keywords("연관브랜드", 5)).isNotEmpty().allSatisfy(keyword -> assertThat(keyword).startsWith("연관브랜드 "));
        assertThat(keywords("연관브랜드 수분", 5)).containsExactly("연관브랜드 수분 연관토너", "연관브랜드 수분 연관토너 대용량");
        assertThat(keywords("다른진정", 5)).containsExactly("다른연관 진정 연관토너");
        assertThat(keywords("존재할수없는연관키워드", 5)).isEmpty();
    }

    @Test
    @DisplayName("배지로 맞은 제품은 배지 이름을 붙인 제품명으로 보여 주고 배지 부분을 강조한다")
    void prefixesMarkWhenMarkMatched() {
        assertThat(keywords("다이소", 5)).containsExactly("다이소 수분 연관토너");
        assertThat(keywords("다이소 수분", 5)).containsExactly("다이소 수분 연관토너");

        RelatedKeyword item = queries.relatedKeywords("다이소", 5).mapItems(keyword -> keyword).getFirst();
        assertThat(item.startIndex()).isZero();
        assertThat(item.endIndexExclusive()).isEqualTo(3);
    }

    @Test
    @DisplayName("브랜드 없이 이어지지 않는 검색어는 브랜드 부분을 강조한다")
    void highlightsBrandWhenQueryIsSplit() {
        RelatedKeyword item = queries.relatedKeywords("연관브랜드 연관토너", 5).mapItems(keyword -> keyword).getFirst();
        assertThat(item.startIndex()).isZero();
        assertThat(item.endIndexExclusive()).isEqualTo(5);
    }

    @ParameterizedTest
    @ValueSource(strings = {"연관토너", "연관브랜드", "연관브랜드 수분", "다른진정", "다이소", "다이소 수분", "피디알엔", "연관토내", "ㅇㄱㅌㄴ"})
    @DisplayName("돌려준 모든 연관검색어를 기존 검색으로 다시 찾을 수 있다")
    void everyKeywordHasResults(String query) {
        assertThat(keywords(query, 5)).isNotEmpty()
            .allSatisfy(keyword -> assertThat(products.hasSearchResults(keyword)).as(keyword).isTrue());
    }

    @Test
    @DisplayName("기존 제품명 검색의 유니코드 정규화·초성·영문 읽기를 재사용한다")
    void reusesProductNameMatching() {
        assertThat(keywords(Normalizer.normalize("연관토너", Normalizer.Form.NFD), 5))
            .isEqualTo(keywords("연관토너", 5));
        assertThat(keywords("ㅇㄱㅌㄴ", 5)).isEqualTo(keywords("연관토너", 5));
        assertThat(keywords("피디알엔", 5)).containsExactly("보습 PDRN 연관세럼");
    }

    @Test
    @DisplayName("검색 결과가 없을 때만 교정한 검색어로 다시 조회한다")
    void correctsQueryWhenNoNamesMatch() {
        assertThat(keywords("연관토내", 5)).isEqualTo(keywords("연관토너", 5)).isNotEmpty();

        jdbc.update("update product set product_name = '연관토내' where id = 91013");
        jdbc.execute("refresh materialized view product_search_document");
        assertThat(keywords("연관토내", 5)).containsExactly("연관토내");
    }

    @Test
    @DisplayName("문장 끝이 아닌 실제 제품명 매칭 위치를 UTF-16으로 반환한다")
    void highlightsOriginalProductName() {
        List<RelatedKeyword> items = queries.relatedKeywords("보습", 5).mapItems(item -> item);
        RelatedKeyword first = items.getFirst();
        assertThat(first.keyword()).isEqualTo("😀보습 연관토너");
        assertThat(first.startIndex()).isEqualTo(2);
        assertThat(first.endIndexExclusive()).isEqualTo(4);

        RelatedKeyword reading = queries.relatedKeywords("피디알엔", 5).mapItems(item -> item).getFirst();
        assertThat(reading.startIndex()).isEqualTo(3);
        assertThat(reading.endIndexExclusive()).isEqualTo(7);
    }

    private List<String> keywords(String query, int limit) {
        return queries.relatedKeywords(query, limit).mapItems(RelatedKeyword::keyword);
    }
}
