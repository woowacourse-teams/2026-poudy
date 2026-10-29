package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional(isolation = Isolation.SERIALIZABLE)
@Sql("/db/search-test-data.sql")
class ProductMetadataSearchTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private ProductRepository products;

    @BeforeEach
    void connectMetadata() {
        jdbc.update("update product set category_id = 14 where id between 90001 and 90020");
        assign(90001, "MINERAL");
        assign(90002, "ORGANIC");
        assign(90003, "HYBRID");
        assign(90004, "MINERAL");
        assign(90006, "MINERAL");
        assign(90001, "EASY_WASH");
        assign(90004, "EASY_WASH");
        jdbc.update("""
            insert into product_mark(product_id, mark_code)
            values (90001, 'DAISO'), (90002, 'DAISO'), (90006, 'DAISO')
            """);
    }

    @Test
    void findsEachAttributeValueWithoutRequiringItInTheProductName() throws Exception {
        assertMatches("무기자차", 90001, 90004, 90006);
        assertMatches("유기자차", 90002);
        assertMatches("혼합자차", 90003);
        assertMatches("이지워시", 90001, 90004);
        assertMatches("다이소", 90001, 90002, 90006);
    }

    @Test
    void requiresEveryConditionOnTheSameProductAcrossSearchEndpoints() throws Exception {
        assertConsistentResults("라운드랩 무기자차 다이소 검증독도", 90006);
        assertConsistentResults("라운드랩 유기자차 다이소 검증독도");
        assertMatches("라운드랩 무기자차 다이소 무기자차 검증독도", 90006);
        assertMatches("다이소 혼합자차");
        assertMatches("소무");
    }

    @Test
    void combinesAttributeConditionsWithAnd() throws Exception {
        assertMatches("무기자차 이지워시", 90001, 90004);
        assertMatches("무기자차 유기자차");
    }

    @ParameterizedTest
    @ValueSource(strings = {"무기", "ㅁㄱㅈㅊ", "무기자챠"})
    void supportsPartialInputChosungAndCorrection(String keyword) throws Exception {
        assertMatches(keyword, 90001, 90004, 90006);
    }

    @Test
    void preservesMetadataConditionsAfterCorrectingAProductName() throws Exception {
        assign(90012, "MINERAL");
        assertMatches("무기자차 검증스내일", 90012);
        assertMatches("유기자차 검증스내일");
    }

    @Test
    void keepsExistingNameMatchesWithoutInferringAnAttributeConnection() throws Exception {
        jdbc.update("update product set product_name = '무기자차 이름제품' where id = 90005");
        jdbc.execute("refresh materialized view product_search_document");
        assertMatches("무기자차", 90001, 90004, 90005, 90006);
        assertMatches("무기자차 이름제품", 90005);
    }

    @Test
    void reflectsMarkConnectionsWithoutRefreshingSearchViews() throws Exception {
        jdbc.update("delete from product_mark where product_id = 90001 and mark_code = 'MINERAL'");
        assertMatches("무기자차", 90004, 90006);
        jdbc.update("delete from product_mark where mark_code = 'DAISO'");
        assertMatches("다이소");
    }

    @ParameterizedTest
    @ValueSource(strings = {"자외선 차단 유형", "MINERAL", "워터프루프"})
    void doesNotUseGroupNamesCodesOrUnconnectedDefinitions(String keyword) throws Exception {
        assertMatches(keyword);
    }

    @Test
    void doesNotCorrectUnconnectedKnownMarksIntoAnotherValue() throws Exception {
        jdbc.update("delete from product_mark where mark_code = 'MINERAL'");
        assertMatches("무기자차");
    }

    @Test
    void returnsTheActualMetadataFieldTextAndUtf16Range() throws Exception {
        mvc.perform(get("/api/products/suggestions").param("keyword", "무기자차"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].match.field").value("MARK"))
            .andExpect(jsonPath("$.items[0].match.text").value("무기자차"))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(0))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(4));

    }

    @Test
    void keepsKeywordConditionsWhenComputingFilterOptions() throws Exception {
        mvc.perform(get("/api/products").param("keyword", "무기자차").param("marks", "ORGANIC"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(
                jsonPath("$.filterOptions.markGroups[?(@.code == 'UV_FILTER_TYPE')].options[*].code")
                    .value(contains("MINERAL", "ORGANIC"))
            )
            .andExpect(
                jsonPath("$.filterOptions.markGroups[?(@.code == 'UV_FILTER_TYPE')].options[*].productCount")
                    .value(contains(3, 0))
            );
        mvc.perform(get("/api/products/count").param("keyword", "무기자차").param("marks", "ORGANIC"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void doesNotDuplicateProductsWithMultipleMatchingMarksAcrossPages() throws Exception {
        mvc.perform(get("/api/products").param("keyword", "다이소").param("size", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001, 90002)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
        mvc.perform(get("/api/products").param("keyword", "다이소").param("page", "2").param("size", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90006)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
        mvc.perform(get("/api/products/suggestions").param("keyword", "다이소").param("page", "2").param("size", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90006)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
    }

    private void assertMatches(String keyword, Integer... ids) throws Exception {
        mvc.perform(get("/api/products").param("keyword", keyword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(ids)))
            .andExpect(jsonPath("$.pagination.totalElements").value(ids.length));
    }

    private void assertConsistentResults(String keyword, Integer... ids) throws Exception {
        assertMatches(keyword, ids);
        mvc.perform(get("/api/products/count").param("keyword", keyword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(ids.length));
        mvc.perform(get("/api/products/suggestions").param("keyword", keyword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(ids)))
            .andExpect(jsonPath("$.pagination.totalElements").value(ids.length));
        assertThat(products.hasSearchResults(keyword)).isEqualTo(ids.length > 0);
    }

    private void assign(long productId, String valueCode) {
        jdbc.update("insert into product_mark(product_id, mark_code) values (?, ?)", productId, valueCode);
    }
}
