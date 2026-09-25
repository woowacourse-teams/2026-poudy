package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("PostgreSQL 카탈로그 검색")
class PostgresSearchTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("대소문자, 전각과 분해된 한글을 정규화한다")
    void normalizesNames() {
        assertThat(text("select search_norm(?)", " ＰＤＲＮ-크림 ")).isEqualTo("pdrn크림");
        assertThat(productIds("ＰＤＲＮ", 2)).contains(90005L);
        assertThat(productIds(Normalizer.normalize("검증토너", Normalizer.Form.NFD), 2))
            .isEqualTo(productIds("검증토너", 2));
        assertThat(productIds("DR.G", 2)).containsExactly(90007L);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "---", "😀"})
    @DisplayName("정규화 후 비어 있는 검색어는 전체 카탈로그를 반환하지 않는다")
    void emptyQueryMatchesNothing(String query) {
        assertThat(productIds(query, 3)).isEmpty();
        assertThat(ingredientIds(query)).isEmpty();
        assertThat(jdbc.queryForObject("select total from search_products(?, 0, 5)", Long.class, query))
            .isZero();
    }

    @Test
    @DisplayName("열한 번째 토큰도 전체 일치 조건에 포함한다")
    void retainsAllTokens() {
        String query = "가 나 다 라 마 바 사 아 자 차 카";
        assertThat(jdbc.queryForObject("select count(*) from search_query_tokens(?)", Long.class, query))
            .isEqualTo(11);
        assertThat(productIds(query, 2)).doesNotContain(90009L);
        assertThat(productIds(query, 3)).contains(90009L);
    }

    @Test
    @DisplayName("유니코드 공백으로 토큰을 나누고 중복은 처음 것만 남긴다")
    void splitsUnicodeSpaces() {
        assertThat(
            jdbc.queryForList(
                "select norm from search_query_tokens(?)",
                String.class,
                "검증토너\u00a0검증수분 검증토너"
            )
        ).containsExactly("검증토너", "검증수분");
    }

    @Test
    @DisplayName("목록에는 전체 토큰 일치만, 제안에는 일부 토큰 일치도 남긴다")
    void distinguishesAllAndPartialTokens() {
        assertThat(productIds("검증수분 검증토너", 2)).containsExactly(90008L);
        assertThat(productIds("검증수분 검증토너", 3)).startsWith(90008L).contains(90001L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"라운드랩검증독도", "검증독도라운드", "라운드검증독도", "ROUND LAB 검증독도"})
    @DisplayName("브랜드 전체나 두 글자 이상 접두와 제품명을 조합한다")
    void combinesBrandAndProduct(String query) {
        assertThat(productIds(query, 2)).containsExactly(90006L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"운드검증독도", "라검증독도", "지블"})
    @DisplayName("브랜드 중간 조각이나 한 글자 접두와 필드 경계의 가짜 일치를 제외한다")
    void rejectsInvalidCombination(String query) {
        assertThat(
            jdbc.queryForList(
                "select product_id from search_products_core(?)",
                Long.class,
                query
            )
        ).doesNotContain(90006L, 90007L);
    }

    @Test
    @DisplayName("일치 등급 다음 최근 조회수, 이름 길이와 ID로 순서를 결정한다")
    void ranksProducts() {
        assertThat(productIds("검증토너", 2)).containsExactly(90001L, 90004L, 90002L, 90003L, 90008L);
        assertThat(
            jdbc.queryForObject(
                "select recent_views from search_products_core('검증토너') where product_id = 90004",
                Long.class
            )
        ).isEqualTo(5);
        assertThat(
            jdbc.queryForObject(
                "select recent_views from search_products_core('검증토너') where product_id = 90002",
                Long.class
            )
        ).isZero();
    }

    @Test
    @DisplayName("페이지를 자른 뒤에도 전체 개수와 순위를 유지한다")
    void pagesResults() {
        Map<String, Object> page = jdbc.queryForMap(
            "select total, items->0->>'productId' as id, items->0->>'rank' as rank"
                + " from search_products('검증토너', 1, 1)"
        );
        assertThat(page).containsEntry("total", 5L).containsEntry("id", "90004").containsEntry("rank", "2");
        assertThat(
            jdbc.queryForMap(
                "select total, jsonb_array_length(items) as size from search_products('검증토너', 10, 2)"
            )
        ).containsEntry("total", 5L).containsEntry("size", 0);
    }

    @Test
    @DisplayName("정확한 별칭이 접두 일치 이름보다 먼저 오고 같은 성분은 한 번만 반환한다")
    void ranksIngredientAliases() {
        assertThat(ingredientIds("계약성분")).containsExactly(90002L, 90001L);
        assertThat(
            text(
                "select items->0->>'matchField' from search_ingredients('계약성분', 0, 5)"
            )
        ).isEqualTo("ALIAS");
        assertThat(ingredientIds("피디알엔 검증성분")).containsOnlyOnce(90007L);
    }

    @Test
    @DisplayName("서로 다른 별칭의 토큰을 모아 전체 일치로 만들지 않는다")
    void keepsAliasBoundaries() {
        assertThat(
            jdbc.queryForObject(
                "select tier from search_ingredients_core('계약수분 계약진정') where ingredient_id = 90003",
                Integer.class
            )
        ).isEqualTo(3);
    }

    @Test
    @DisplayName("한 글자 초성은 쌍자음도 찾지만 여러 초성은 정확히 비교한다")
    void matchesInitials() {
        assertThat(productIds("ㅂ", 3)).contains(90010L, 90011L);
        assertThat(productIds("ㅂㄱ", 3)).doesNotContain(90010L);
        assertThat(productIds("ㅃㄱ", 3)).contains(90010L);
        assertThat(productIds("ㅃ", 3)).doesNotContain(90011L);
        assertThat(ingredientIds("ㅂ")).contains(90004L, 90005L);
        assertThat(ingredientIds("ㅂㄱ")).doesNotContain(90004L);
        assertThat(ingredientIds("ㅃㄱ")).contains(90004L);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "PDRN 검증 크림|pdrn|[0,4)",
            "PDRN 검증 크림|피디알엔|[0,4)",
            "PDRN 검증 크림|ㅍㄷㅇㅇ|[0,4)",
            "블랙 스네일 토너|스네일토너|[3,9)",
            "😀검증젤|검증젤|[2,5)",
            "빨간검증|ㅂ|[0,1)",
            "ＰＤＲＮ 크림|pdrn|[0,4)",
            "검증 비타민C|비타민씨|[3,7)"
    }, delimiter = '|')
    @DisplayName("원형과 읽기 검색을 UTF-16 원문 범위로 되돌린다")
    void mapsOriginalRange(String source, String query, String expected) {
        assertThat(
            text(
                "select int4range(r[1], r[2])::text from (select search_match_range(?, ?) r) ranges",
                source,
                query
            )
        ).isEqualTo(expected);
    }

    @Test
    @DisplayName("상품과 성분의 반환된 강조 구간은 비어 있지 않다")
    void returnsRangesForBothSpellings() {
        assertThat(
            text(
                "select items->0->'matchRange' from search_products('PDRN', 0, 5)"
            )
        ).isEqualTo("[0, 4]");
        assertThat(
            text(
                "select items->0->'matchRange' from search_ingredients('계약성분', 0, 5)"
            )
        ).isEqualTo("[0, 4]");
    }

    @Test
    @DisplayName("영문 한 글자와 긴 단어를 낱자 읽기로 과도하게 확장하지 않는다")
    void boundsLatinReading() {
        assertThat(text("select search_read_query('e')")).isEqualTo("e");
        assertThat(text("select search_read_query('비타민c')")).isEqualTo("비타민씨");
        assertThat(text("select search_reading_name('더마water크림')")).isEqualTo("더마water크림");
        assertThat(text("select search_reading_name('Glycerin')")).isEqualTo("glycerin");
    }

    @Test
    @DisplayName("전체 일치가 없을 때 오타를 교정하고 교정된 구간을 표시한다")
    void correctsMisspelling() {
        assertThat(productIds("검증스내일", 2)).containsExactly(90012L);
        assertThat(
            text(
                "select corrected_query from search_products('검증스내일', 0, 5, 2)"
            )
        ).isEqualTo("검증스네일");
        assertThat(
            text(
                "select items->0->'matchRange' from search_products('검증스내일', 0, 5, 2)"
            )
        ).isEqualTo("[0, 5]");
        assertThat(ingredientIds("검증스내일원료")).containsExactly(90006L);
        assertThat(
            text(
                "select corrected_query from search_products('검증스네일', 0, 5)"
            )
        ).isNull();
    }

    @Test
    @DisplayName("검색 뷰를 갱신하면 바뀐 이름이 검색에 반영된다")
    void refreshesSearchDocument() {
        jdbc.update("update product set product_name = '새검증상품' where id = 90001");
        assertThat(
            jdbc.queryForList(
                "select product_id from search_products_core('새검증상품')",
                Long.class
            )
        ).isEmpty();
        jdbc.execute("refresh materialized view product_search_document");
        assertThat(
            jdbc.queryForList(
                "select product_id from search_products_core('새검증상품')",
                Long.class
            )
        ).containsExactly(90001L);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "select * from search_products('토너', -1, 5)",
            "select * from search_products('토너', 0, 0)",
            "select * from search_products('토너', 0, 5, null)",
            "select * from search_ingredients('성분', null, 5)",
            "select * from search_ingredients('성분', 0, 5, 4)"
    })
    @DisplayName("유효하지 않은 페이지와 등급 조건을 거절한다")
    void rejectsInvalidPage(String sql) {
        assertThatThrownBy(() -> jdbc.queryForList(sql)).isInstanceOf(DataAccessException.class);
    }

    private List<Long> productIds(String query, int maxTier) {
        return jdbc.queryForList(
            "select (item->>'productId')::bigint from search_products(?, 0, 100, ?)"
                + " cross join lateral jsonb_array_elements(items) with ordinality as hits(item, position)"
                + " order by position",
            Long.class,
            query,
            maxTier
        );
    }

    private List<Long> ingredientIds(String query) {
        return jdbc.queryForList(
            "select (item->>'ingredientId')::bigint from search_ingredients(?, 0, 100)"
                + " cross join lateral jsonb_array_elements(items) with ordinality as hits(item, position)"
                + " order by position",
            Long.class,
            query
        );
    }

    private String text(String sql, Object... arguments) {
        return jdbc.queryForObject(sql, String.class, arguments);
    }
}
