package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.repository.MarkSqlParameters;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional(isolation = Isolation.SERIALIZABLE)
@Sql({"/db/search-test-data.sql", "/db/product-equivalent-spelling-test-data.sql", "/db/related-keyword-test-data.sql"})
class ProductSearchEvidenceTest {
    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");
    private static final String MARKS = MarkSqlParameters.definitions()
        .replace("]", ",{\"code\":\"EVIDENCE975\",\"name\":\"검증표식\"}]");
    private static final List<String> REFERENCE_FUNCTIONS = List.of(
        "search_product_queries",
        "search_product_metadata_hits",
        "search_product_hits",
        "search_products_core_v2",
        "search_correct_product_query_v2",
        "search_products_page_v2",
        "search_products_v2"
    );
    private static final List<String> QUERIES = List.of(
        "",
        "---",
        "없는입력",
        "검증토너",
        "검증 토너",
        "ㅂ",
        "ㅃ",
        "ㅂㄱ",
        "ㅃㄱ",
        "PDRN",
        "피디알엔",
        "e",
        "비타민씨",
        "검증스내일",
        "닥터지 블랙검증",
        "닥터지블랙검증",
        "블랙검증닥터지",
        "DR.G블랙검증",
        "지블",
        "😀검증젤",
        "선크림",
        "썬크림",
        "선크",
        "썬크",
        "선크림 썬크",
        "썬크림 선크",
        "선 크림",
        "썬 크림",
        "선크림 선크림",
        "닥터지 선크림",
        "닥터지썬크림",
        "썬크림닥터지",
        "수분썬크림",
        "수분 썬크림",
        "선크림 없는조건",
        "무기자차",
        "검증표식",
        "무기자차 검증표식",
        "닥터지 썬크림 무기자차 검증표식",
        "무기자차 없는조건",
        "연관토너",
        "연관토너 관토",
        "연관브랜드",
        "연관브랜드 수분",
        "연관브랜드 연관토너",
        "다른진정",
        "다이소 수분",
        "연관토내",
        "ㅇㄱㅌㄴ",
        "가 나 다 라 마 바 사 아 자 차 카",
        "검증토너\u00a0검증수분 검증토너"
    );
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private NamedParameterJdbcTemplate named;

    @Test
    void preservesSearchPoliciesPagesAndRelatedTextAgainstDevMarkContract() throws Exception {
        jdbc.update("insert into mark(code) values ('EVIDENCE975')");
        jdbc.update(
            "insert into product_mark(product_id,mark_code) values (90101,'EVIDENCE975'),(90107,'EVIDENCE975')"
        );
        jdbc.update("insert into product_mark(product_id,mark_code) values (90101,'MINERAL')");
        jdbc.execute("do $$ begin perform similarity('warmup', 'warmup'); end $$");
        for (String name : REFERENCE_FUNCTIONS) {
            restoreReference(name);
        }
        List<String> before = snapshot(true);
        List<String> after = snapshot(false);
        assertThat(after).containsExactlyElementsOf(before);
    }

    @Test
    void retainsWhichFieldSatisfiedEachMandatoryToken() {
        jdbc.update("insert into product_mark(product_id,mark_code) values (90101,'MINERAL')");
        List<Map<String, Object>> evidence = jdbc.queryForList("""
            select m.ord, m.field, m.query, m.text from
            search_product_match_evidence(search_product_analyze('닥터지 썬크림 무기자차 무기자차'), true, ?::jsonb) e,
            unnest(e.fields) m
            where e.product_id=90101 and m.ord > 0
            order by m.ord, m.field
            """, MARKS);
        assertThat(evidence).containsExactly(
            Map.of("ord", 1, "field", "BRAND_NAME", "query", "닥터지", "text", "닥터지"),
            Map.of("ord", 2, "field", "PRODUCT_NAME", "query", "선크림", "text", "수분 썬크림 차단"),
            Map.of("ord", 3, "field", "MARK", "query", "무기자차", "text", "무기자차")
        );
    }

    @Test
    void carriesTheSelectedBrandAndProductPiecesToPresentation() {
        assertThat(jdbc.queryForMap("""
            select (e.combination).brand_part, (e.combination).product_part, (e.combination).tier
            from search_product_match_evidence(search_product_analyze('닥터지블랙검증'), true) e
            where e.product_id=90007
            """)).containsExactlyInAnyOrderEntriesOf(Map.of("brand_part", "닥터지", "product_part", "블랙검증", "tier", 0));
        assertThat(jdbc.queryForObject("""
            select count(*) from search_product_combination_matches(search_product_analyze('지블'))
            """, Integer.class)).isZero();
    }

    @Test
    void appliesNewSpellingRulesAfterTheSearchPlanHasBeenReused() {
        for (int i = 0; i < 8; i++) {
            jdbc.queryForObject("select total from search_products_v2(?,0,5,2)", Long.class, "닥터지 검증짧");
        }
        jdbc.update("update product set product_name='검증짧' where id=90107");
        jdbc.update("update product set product_name='검증긴표기' where id=90108");
        jdbc.execute("""
            create or replace function search_product_spelling_rules()
                returns text[][] language sql immutable parallel safe
                return array[['썬크림','선크림'], ['검증짧','검증긴표기']]
            """);
        jdbc.execute("refresh materialized view product_search_document");
        assertThat(jdbc.queryForMap("""
            select norm, has_spelling from unnest(search_product_analyze(?)) where ord=2
            """, "닥터지 검증짧"))
            .containsEntry("norm", "검증긴표기").containsEntry("has_spelling", true);
        assertThat(jdbc.queryForObject("select total from search_products_v2(?,0,5,2)", Long.class, "닥터지 검증짧"))
            .isEqualTo(2);
    }

    private List<String> snapshot(boolean before) throws Exception {
        List<String> results = new ArrayList<>();
        String previousRelated = Files
            .readString(Path.of("src/test/resources/db/product-related-keywords-before-975.sql"));
        String suffix = before ? "_before975" : "";
        String related = before ? previousRelated
            .replace("search_products_v2(", "search_products_v2_before975(")
            .replace("search_product_metadata_hits(", "search_product_metadata_hits_before975(")
            .replace(":limit, 2)", ":limit, 2, cast(:marks as jsonb))")
            .replace(
                "search_product_metadata_hits_before975(result.query)",
                "search_product_metadata_hits_before975(result.query, cast(:marks as jsonb))"
            )
            : "select * from search_product_related_keywords(:keyword, :limit, :maxLength, cast(:marks as jsonb))";
        for (String query : QUERIES) {
            String scores = before ? """
                select (item ->> 'productId')::bigint as product_id,
                    (item ->> 'tier')::smallint as tier, (item ->> 'tokenRatio')::real as token_ratio,
                    (item ->> 'recentViews')::bigint as recent_views, length(d.product_norm) as name_length
                from search_products_v2_before975(?,0,null,2,?::jsonb) r, jsonb_array_elements(r.items) item
                join product_search_document d on d.product_id = (item ->> 'productId')::bigint
                """ : "select * from search_product_results(?,2,?::jsonb)";
            results.add(
                jdbc.queryForObject(
                    "select coalesce(jsonb_agg(to_jsonb(s) order by product_id), '[]'::jsonb)::text from (" + scores
                        + ") s",
                    String.class,
                    query,
                    MARKS
                )
            );
            for (boolean metadata : List.of(false, true)) {
                results.add(
                    jdbc.queryForObject(
                        """
                            select coalesce(jsonb_agg(to_jsonb(h) || jsonb_build_object('range', search_match_range(h.match_text,h.match_query))
                                order by h.product_id), '[]'::jsonb)::text
                            from search_product_hits%s(?, ?, ?::jsonb) h
                            """
                            .formatted(suffix),
                        String.class,
                        query,
                        metadata,
                        MARKS
                    )
                );
            }
            results.add(
                jdbc.queryForObject(
                    "select to_jsonb(r)::text from search_products_v2" + suffix + "(?,0,5,2,?::jsonb) r",
                    String.class,
                    query,
                    MARKS
                )
            );
            results.add(
                named.queryForObject(
                    "select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)::text from (" + related + ") r",
                    Map.of("keyword", query, "limit", 5, "maxLength", 100, "marks", MARKS),
                    String.class
                )
            );
        }
        for (String query : List.of("검증토너", "검증토내", "검증수분 검증토너", "닥터지썬크림", "없는입력")) {
            for (int tier : List.of(0, 1, 2, 3)) {
                for (int offset : List.of(0, 2, 100)) {
                    results.add(
                        jdbc.queryForObject(
                            "select to_jsonb(r)::text from search_products_v2" + suffix + "(?,?,2,?,?::jsonb) r",
                            String.class,
                            query,
                            offset,
                            tier,
                            MARKS
                        )
                    );
                }
                results.add(
                    jdbc.queryForObject(
                        "select to_jsonb(r)::text from search_products_v2" + suffix + "(?,0,null,?,?::jsonb) r",
                        String.class,
                        query,
                        tier,
                        MARKS
                    )
                );
            }
        }
        return results;
    }

    private void restoreReference(String name) throws Exception {
        String file = name.equals("search_product_queries") ? "V41__shared_product_search.sql"
            : "V46__unify_product_marks.sql";
        String source = Files.readString(MIGRATIONS.resolve(file));
        int start = source.indexOf("CREATE OR REPLACE FUNCTION " + name + "(");
        if (start < 0) {
            start = source.indexOf("CREATE FUNCTION " + name + "(");
        }
        int end = source.indexOf("$$;", source.indexOf("AS $$", start) + 5) + 3;
        String definition = source.substring(start, end);
        for (String function : REFERENCE_FUNCTIONS) {
            definition = definition.replace(function + "(", function + "_before975(");
        }
        jdbc.execute(definition);
    }
}
