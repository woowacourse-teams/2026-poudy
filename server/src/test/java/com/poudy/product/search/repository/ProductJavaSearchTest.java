package com.poudy.product.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.repository.query.ProductSearchQueryCodec;
import com.poudy.product.search.service.ProductSearchService;
import com.poudy.product.search.support.ProductSearchTestIndex;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql({"/db/search-test-data.sql", "/db/product-jamo-search-test-data.sql"})
class ProductJavaSearchTest {
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private ProductSearchService search;
    private final ProductSearchAnalyzer analyzer = new ProductSearchAnalyzer();
    private final ProductSearchQueryCodec codec = new ProductSearchQueryCodec();

    @BeforeEach
    void index() {
        ProductSearchTestIndex.rebuild(jdbc);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "젤리크림|젤리크리ㅁ",
            "젤리크림|젤리ㅋㅡ림",
            "젤리크림|젤리ㅋㅡㄹㅣㅁ",
            "젤리수분크림|젤리수ㅂㅜㄴ크림",
            "젤리과일|젤리고ㅏ일",
            "젤리과일|젤리ㄱㅗㅏ일",
            "젤리닭가슴살|젤리달ㄱ가슴살",
            "젤리닭가슴살|젤리ㄷㅏㄹㄱ가슴살",
            "자모브랜드젤리과일|자모브랜드젤리고ㅏ일",
            "자모브랜드 젤리크림|자모브랜드 젤리ㅋㅡ림",
            "젤리 피디알엔|젤리 ㅍㅣ디알엔"})
    void splitInputHasSameProductsGradesOrderAndRanges(String complete, String split) {
        assertThat(hits(complete)).isNotEmpty();
        assertThat(hits(split)).isEqualTo(hits(complete));
        assertThat(search.suggest(split, 1, 20)).usingRecursiveComparison().isEqualTo(search.suggest(complete, 1, 20));
        assertThat(search.hasResults(split)).isEqualTo(search.hasResults(complete));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "검증토너",
            "토너",
            "ㅌㄴ",
            "ㅌ",
            "PDRN",
            "피디알엔",
            "검증 피디알엔",
            "검증브랜드검증토너",
            "검증토너검증브랜드",
            "검증 스네일",
            "검증스내일",
            "검증젤",
            "크림",
            "젤리크림",
            "자모브랜드 젤리크림",
            "없는상품"})
    void keepsLegacyApiOrderAndHighlightForExistingInput(String query) {
        List<List<Object>> expected = jdbc.query(
            """
                select (item->>'productId')::bigint id,item->>'matchField' field,item->>'matchText' text,
                       (item->'matchRange'->>0)::int start,(item->'matchRange'->>1)::int finish
                from search_products(?,0,100,3) r,jsonb_array_elements(r.items) with ordinality i(item,ord) order by i.ord
                """,
            (rs, row) -> List.of(
                rs.getLong("id"),
                rs.getString("field"),
                rs.getString("text"),
                rs.getInt("start"),
                rs.getInt("finish")
            ),
            query
        );
        var result = search.suggest(query, 1, 100);
        assertThat(
            result.items().stream()
                .map(
                    i -> List.<Object>of(
                        i.id(),
                        i.field().name(),
                        i.text(),
                        i.range().startIndex(),
                        i.range().endIndexExclusive()
                    )
                ).toList()
        )
            .isEqualTo(expected);
        assertThat(result.totalElements())
            .isEqualTo(jdbc.queryForObject("select total from search_products(?,0,100,3)", Long.class, query));
    }

    @Test
    void keepsSyllableAndFieldBoundaries() {
        assertThat(ids("젤리닭")).doesNotContain(90106L);
        assertThat(ids("크림")).doesNotContain(90109L);
        assertThat(ids("젤리고")).doesNotContain(90104L);
        assertThat(ids("젤리달")).doesNotContain(90105L);
        assertThat(ids("젤리크리")).doesNotContain(90101L);
        assertThat(ids("ㅋ림")).isEmpty();
        assertThat(ids("젤리크램")).contains(90102L).doesNotContain(90101L);
    }

    @Test
    void rebuildsNamesAndUtf16RangesFromTheSameSource() {
        jdbc.update("update product set product_name='🧴 ㅋㅡㄹㅣㅁ PDRN' where id=90101");
        ProductSearchTestIndex.rebuild(jdbc);
        var cream = search.suggest("크림", 1, 100).items().stream().filter(p -> p.id() == 90101L).findFirst()
            .orElseThrow();
        assertThat(cream.text().substring(cream.range().startIndex(), cream.range().endIndexExclusive()))
            .isEqualTo("ㅋㅡㄹㅣㅁ");
        var reading = search.suggest("피디알엔", 1, 100).items().stream().filter(p -> p.id() == 90101L).findFirst()
            .orElseThrow();
        assertThat(reading.text().substring(reading.range().startIndex(), reading.range().endIndexExclusive()))
            .isEqualTo("PDRN");
    }

    @Test
    void prefersOriginalInitialHighlightWhileKeepingBestReadingGrade() {
        jdbc.update("update product set product_name='B3징크 트러블 세럼' where id=90101");
        ProductSearchTestIndex.rebuild(jdbc);
        var item = search.suggest("ㅂ", 1, 100).items().stream().filter(p -> p.id() == 90101L).findFirst().orElseThrow();
        assertThat(item.range().startIndex()).isEqualTo(7);
        assertThat(item.range().endIndexExclusive()).isEqualTo(8);
        Map<String, Object> hit = hits("ㅂ").stream().filter(p -> ((Number) p.get("product_id")).longValue() == 90101)
            .findFirst().orElseThrow();
        assertThat(((Number) hit.get("tier")).intValue()).isEqualTo(1);
    }

    private List<Long> ids(String query) {
        return hits(query).stream().map(r -> ((Number) r.get("product_id")).longValue()).toList();
    }

    private List<Map<String, Object>> hits(String query) {
        return jdbc.queryForList(
            "select * from search_product_hits(cast(? as jsonb)) order by tier,token_ratio desc,recent_views desc,name_length,product_id",
            codec.encode(analyzer.analyzeQuery(query))
        );
    }
}
