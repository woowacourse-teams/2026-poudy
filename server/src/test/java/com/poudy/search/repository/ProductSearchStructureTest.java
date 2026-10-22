package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
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
class ProductSearchStructureTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void preservesV34ResultsRanksHighlightsAndFunctionIdentities() throws Exception {
        jdbc.update("insert into badge(code,name) values ('STRUCTURE797','검증표식')");
        jdbc.update(
            "insert into product_badge(product_id,badge_code) values (90101,'STRUCTURE797'),(90107,'STRUCTURE797')"
        );
        jdbc.update(
            "insert into product_attribute_value(product_id,attribute_id,value_code) select 90101,id,'MINERAL' from attribute where code='UV_FILTER_TYPE'"
        );
        String v34 = Files.readString(Path.of("src/main/resources/db/migration/V34__product_search_standard_form.sql"));
        for (String name : List.of("search_products_core", "search_product_metadata_hits", "search_products_core_v2")) {
            int start = v34.indexOf("CREATE OR REPLACE FUNCTION " + name + "(");
            int end = v34.indexOf("\n$$;", start) + 4;
            jdbc.execute(v34.substring(start, end));
        }
        List<String> functions = List.of("search_products_core", "search_products_core_v2");
        List<Long> identities = functions.stream().map(this::identity).toList();
        List<String> queries = List.of(
            "",
            "없는입력",
            "검증토너",
            "검증 토너",
            "ㅂ",
            "ㅃ",
            "피디알엔",
            "pdrn",
            "검증스내일",
            "닥터지 블랙검증",
            "닥터지블랙검증",
            "블랙검증닥터지",
            "DR.G 블랙검증",
            "비타민씨",
            "😀검증젤",
            "선크림",
            "썬크림",
            "선크림 썬크림",
            "선크",
            "썬크",
            "선크림 썬크",
            "썬크림 선크",
            "닥터지 선크림",
            "닥터지썬크림",
            "썬크림닥터지",
            "수분썬크림",
            "수분 썬크림",
            "없는브랜드 썬크림",
            "검증표식",
            "검증표식 수분",
            "무기자차",
            "무기자차 검증표식",
            "닥터지 썬크림 무기자차 검증표식",
            "닥터지 썬크림 유기자차 검증표식",
            "선크림 없는조건",
            "수분 블랙검증",
            "닥터지 수분 크림"
        );
        List<List<Map<String, Object>>> before = snapshot(functions, queries);

        jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V35__shared_product_search.sql")));

        assertThat(functions.stream().map(this::identity).toList()).isEqualTo(identities);
        List<List<Map<String, Object>>> after = snapshot(functions, queries);
        for (int i = 0; i < before.size(); i++) {
            assertThat(after.get(i)).as("%s / %s", functions.get(i / queries.size()), queries.get(i % queries.size()))
                .isEqualTo(before.get(i));
        }
    }

    @Test
    void acceptsAllConditionsOnOneProductAndKeepsLegacyPartialMatches() {
        jdbc.update("insert into badge(code,name) values ('STRUCTURE797','검증표식')");
        jdbc.update(
            "insert into product_badge(product_id,badge_code) values (90101,'STRUCTURE797'),(90107,'STRUCTURE797')"
        );
        jdbc.update(
            "insert into product_attribute_value(product_id,attribute_id,value_code) select 90101,id,'MINERAL' from attribute where code='UV_FILTER_TYPE'"
        );
        for (String spelling : List.of("선크림", "썬크림")) {
            String query = "닥터지 " + spelling + " 무기자차 검증표식";
            assertThat(
                jdbc.queryForList("select product_id from search_products_core_v2(?) where tier<=2", Long.class, query)
            )
                .containsExactly(90101L);
            assertThat(
                jdbc.queryForList("select product_id from search_products_core(?) where tier<=2", Long.class, query)
            )
                .isEmpty();
            assertThat(
                jdbc.queryForList("select product_id from search_products_core_v2(?) where tier=3", Long.class, query)
            )
                .contains(90107L, 90100L);
        }
        assertThat(
            jdbc.queryForList("select product_id from search_products_core_v2('무기자차 없는조건') where tier<=2", Long.class)
        )
            .isEmpty();
    }

    private List<List<Map<String, Object>>> snapshot(List<String> functions, List<String> queries) {
        List<List<Map<String, Object>>> result = new ArrayList<>();
        for (String function : functions) {
            for (String query : queries) {
                result.add(
                    jdbc.queryForList(
                        "select h.*, search_match_range(match_text, match_query)::text as range from "
                            + function + "(?) h order by product_id",
                        query
                    )
                );
            }
        }
        return result;
    }

    private Long identity(String name) {
        return jdbc.queryForObject("select (? || '(text)')::regprocedure::oid", Long.class, name);
    }
}
