package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional(isolation = Isolation.SERIALIZABLE)
@Sql({"/db/search-test-data.sql", "/db/product-equivalent-spelling-test-data.sql"})
class ProductSearchStagesTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void recordsMatchKindsAndCombinationDirectionBeforeApplyingQualityPolicy() {
        assertThat(
            jdbc.queryForList(
                """
                    select product_id, match_kind from search_product_name_facts(search_product_analyze('검증토너'), array[90001,90002,90003,90001,null]::bigint[])
                    where ord=0 and field='PRODUCT_NAME' order by product_id
                    """
            )
        )
            .containsExactly(
                Map.of("product_id", 90001L, "match_kind", "EXACT"),
                Map.of("product_id", 90002L, "match_kind", "PREFIX"),
                Map.of("product_id", 90003L, "match_kind", "CONTAINS")
            );
        for (String query : List.of("닥터지블랙검증", "블랙검증닥터지")) {
            boolean forward = query.startsWith("닥터지");
            assertThat(jdbc.queryForMap("""
                select f.brand_first, f.brand_exact, f.product_exact, f.product_prefix, s.tier, s.ratio
                from search_product_combination_facts(search_product_analyze(?)) f,
                     lateral search_product_combination_score(f) s
                where f.product_id=90007 and f.brand_part='닥터지' and f.product_part='블랙검증'
                """, query)).containsAllEntriesOf(
                Map.of(
                    "brand_first",
                    forward,
                    "brand_exact",
                    true,
                    "product_exact",
                    true,
                    "product_prefix",
                    true,
                    "tier",
                    forward ? 0 : 2,
                    "ratio",
                    forward ? 1.0f : 0.75f
                )
            );
        }
    }

    @Test
    void buildsDetailsOnlyForTheRequestedPageAndNeverForScoreOnlyRequests() {
        assertThat(jdbc.queryForMap("""
            select total, cardinality(scores) as scores, cardinality(details) as details
            from search_product_resolve_result('검증토너', 0, null, 2, false)
            """)).containsAllEntriesOf(Map.of("total", 5L, "scores", 5, "details", 0));
        assertThat(jdbc.queryForMap("""
            select total, cardinality(scores) as scores, cardinality(details) as details
            from search_product_resolve_result('검증토너', 1, 2, 2, true)
            """)).containsAllEntriesOf(Map.of("total", 5L, "scores", 2, "details", 2));
        assertThat(jdbc.queryForList("""
            select d.product_id from search_product_resolve_result('검증토너', 1, 2, 2, true) r, unnest(r.details) d
            order by d.product_id
            """, Long.class)).containsExactly(90002L, 90004L);
        assertThat(jdbc.queryForMap("""
            select total, cardinality(scores) as scores, cardinality(details) as details
            from search_product_resolve_result('검증스내일', 100, 2, 2, true)
            """)).containsAllEntriesOf(Map.of("total", 3L, "scores", 0, "details", 0));
    }

    @Test
    void changingPresentationCannotChangeMembershipOrOrder() {
        List<Map<String, Object>> before = suggestionScores();
        jdbc.execute(
            """
                create or replace function search_product_present(p_parts product_search_part[], p_detail product_search_detail)
                    returns table (match_field text, match_text text, match_query text) language sql immutable parallel safe
                as $$ select 'PRODUCT_NAME'::text, '별도 표시'::text, '표시'::text $$
                """
        );
        assertThat(suggestionScores()).containsExactlyElementsOf(before);
        assertThat(jdbc.queryForObject("""
            select count(*) from search_product_results('검증토너',2)
            """, Long.class)).isEqualTo(5);
        assertThat(jdbc.queryForList("""
            select match_text from search_product_suggestions('검증토너',0,2,2)
            """, String.class)).containsExactly("별도 표시", "별도 표시");
    }

    @Test
    void emptyPresentationDoesNotRemoveAlreadyPagedProducts() {
        List<Map<String, Object>> before = suggestionScores();
        jdbc.execute(
            """
                create or replace function search_product_present(p_parts product_search_part[], p_detail product_search_detail)
                    returns table (match_field text, match_text text, match_query text) language sql immutable parallel safe
                as $$ select null::text, null::text, null::text where false $$
                """
        );
        assertThat(suggestionScores()).containsExactlyElementsOf(before);
        assertThat(jdbc.queryForObject("""
            select count(*) from search_product_suggestions('검증토너',0,2,2) s join product p on p.id = s.product_id
            where s.match_field = 'PRODUCT_NAME' and s.match_text = p.product_name
                and s.match_range = array[0, length(p.product_name)]
            """, Long.class)).isEqualTo(2);
    }

    @Test
    void nullInputKeepsTheDefaultEmptyResultContract() {
        assertThat(jdbc.queryForMap("""
            select total, items::text as items from search_products_v2(null)
            """)).containsAllEntriesOf(Map.of("total", 0L, "items", "[]"));
    }

    @Test
    void narrowTierAndEmptyPageDoNotTriggerCorrectionWhenNormalMatchesExist() {
        jdbc.execute(
            """
                create or replace function search_correct_product_query_v2(p_query text, p_marks jsonb DEFAULT '[]'::jsonb) returns text language plpgsql stable
                as $$ begin raise exception '정상 결과가 있으므로 교정을 호출하면 안 된다'; end $$
                """
        );
        assertThat(jdbc.queryForObject("""
            select count(*) from search_product_results('토너',0)
            """, Long.class)).isZero();
        assertThat(jdbc.queryForObject("""
            select total from search_product_suggestions('토너',100,2,2)
            """, Long.class)).isPositive();
    }

    @Test
    void passesRequestMarkDefinitionsThroughFactsCorrectionAndPagePresentation() {
        jdbc.update("insert into product_mark(product_id,mark_code) values (90101,'DAISO')");
        String marks = "[{\"code\":\"DAISO\",\"name\":\"검증표식\"}]";
        assertThat(jdbc.queryForMap("""
            select f.field, f.text, f.term_key
            from search_product_candidates(search_product_analyze('검증표식'), true, ?::jsonb) c,
                 lateral (select (c.field_fact).*) f
            where c.product_id=90101 and f.ord=0
            """, marks)).containsAllEntriesOf(Map.of("field", "MARK", "text", "검증표식", "term_key", "DAISO"));
        assertThat(jdbc.queryForList("""
            select product_id from search_product_results('검증표식',2,?::jsonb)
            """, Long.class, marks)).containsExactly(90101L);
        assertThat(jdbc.queryForMap("""
            select product_id, match_field, match_text, match_range[1] as start, match_range[2] as finish
            from search_product_suggestions('검증표식',0,2,2,?::jsonb)
            """, marks)).containsAllEntriesOf(
            Map.of("product_id", 90101L, "match_field", "MARK", "match_text", "검증표식", "start", 0, "finish", 4)
        );
        assertThat(jdbc.queryForObject("""
            select keyword from search_product_related_keywords('검증표식',2,100,?::jsonb)
            """, String.class, marks)).isEqualTo("검증표식 수분 썬크림 차단");
        jdbc.execute("""
            create or replace function search_correct_product_query_v2(p_query text, p_marks jsonb DEFAULT '[]'::jsonb)
                returns text language sql stable as $$ select p_marks->0->>'name' $$
            """);
        assertThat(jdbc.queryForMap("""
            select total, corrected_query from search_product_suggestions('없는입력',0,2,2,?::jsonb)
            """, marks)).containsAllEntriesOf(Map.of("total", 1L, "corrected_query", "검증표식"));
        assertThat(jdbc.queryForObject("""
            select count(*) from search_product_results('검증표식',2)
            """, Long.class)).isZero();
    }

    private List<Map<String, Object>> suggestionScores() {
        return jdbc.queryForList("""
            select total, product_id, result_position, tier, token_ratio, recent_views
            from search_product_suggestions('검증토너',0,2,2) order by result_position
            """);
    }
}
