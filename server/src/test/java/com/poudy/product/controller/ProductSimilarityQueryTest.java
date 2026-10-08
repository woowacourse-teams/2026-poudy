package com.poudy.product.controller;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("구성품별 제품 유사도 조회")
class ProductSimilarityQueryTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.update("""
            insert into product_component (id, product_id, display_order, name) overriding system value
            select id, id, 0, '1제' from product where id between 90001 and 90008
            """);
        jdbc.update("""
            insert into product_component (id, product_id, display_order, name) overriding system value
            values (91001, 90001, 1, '2제'), (91002, 90002, 1, '2제')
            """);
        jdbc.update("insert into product_similarity_calculation values (90001), (91001)");
    }

    @Test
    @DisplayName("25점 경계를 포함하고 미달 결과는 채워 넣지 않는다")
    void appliesInclusiveThreshold() throws Exception {
        match(90001, 90002, 0.25);
        match(90001, 90003, 0.249999);
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.partId").value(90001))
            .andExpect(jsonPath("$.calculated").value(true))
            .andExpect(jsonPath("$.items[*].id", contains(90002)))
            .andExpect(jsonPath("$.items[0].partId").value(90002))
            .andExpect(jsonPath("$.items[0].brand.name").value("검증브랜드"))
            .andExpect(jsonPath("$.items[0].similarityScore").doesNotExist());
    }

    @Test
    @DisplayName("같은 제품의 최고 점수 구성품을 고르고 판매 상태와 자기 제품을 거른 뒤 최대 3개를 반환한다")
    void filtersBeforeLimitAndDeduplicates() throws Exception {
        match(90001, 91001, 1);
        match(90001, 90002, 0.8);
        match(90001, 91002, 0.9);
        match(90001, 90003, 0.95);
        match(90001, 90004, 0.7);
        match(90001, 90005, 0.7);
        match(90001, 90006, 0.6);
        jdbc.update("update product_variant set status = 'discontinued' where product_id = 90003");
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(90002, 90004, 90005)))
            .andExpect(jsonPath("$.items[0].partId").value(91002));
    }

    @Test
    @DisplayName("대상 구성품의 성분으로 주의를 판정하며 다른 구성품의 주의 성분은 섞지 않는다")
    void warningUsesMatchedPartOnly() throws Exception {
        jdbc.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select 91002, ingredient_id, 0 from ingredient_group_ingredient
            where group_code = 'FRAGRANCE_ALLERGENS' order by ingredient_id limit 1
            """);
        match(90001, 90002, 0.7);
        match(91001, 91002, 0.8);
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].containsExcludedIngredient").value(false));
        mockMvc.perform(get("/api/products/90001/similarities").param("partId", "91001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.partId").value(91001))
            .andExpect(jsonPath("$.items[0].partId").value(91002))
            .andExpect(jsonPath("$.items[0].containsExcludedIngredient").value(true));
    }

    @Test
    @DisplayName("미계산과 계산했지만 후보가 없는 상태를 구분한다")
    void distinguishesUncalculatedAndEmpty() throws Exception {
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.calculated").value(true))
            .andExpect(jsonPath("$.items").isEmpty());
        mockMvc.perform(get("/api/products/90002/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.calculated").value(false))
            .andExpect(jsonPath("$.items").isEmpty());
        mockMvc.perform(get("/api/products/90009/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.partId").isEmpty())
            .andExpect(jsonPath("$.calculated").value(false))
            .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("없는 제품과 다른 제품의 구성품은 404로 응답한다")
    void validatesProductAndPartOwnership() throws Exception {
        mockMvc.perform(get("/api/products/99999999/similarities"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mockMvc.perform(get("/api/products/90001/similarities").param("partId", "90002"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_PART_NOT_FOUND"));
    }

    @Test
    @DisplayName("계산 후 카테고리가 달라진 후보는 반환하지 않는다")
    void excludesChangedCategory() throws Exception {
        match(90001, 90002, 0.9);
        jdbc.update("update product set category_id = 3 where id = 90002");
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
    }

    private void match(long source, long target, double score) {
        jdbc.update("insert into product_similarity values (?, ?, ?)", source, target, score);
    }

    @Test
    @DisplayName("기준 구성품은 ID가 아닌 표시 순서로 고르고 결과는 방향별로 독립적이다")
    void selectsFirstDisplayedPartWithoutInferringReverseMatches() throws Exception {
        jdbc.update("update product_component set display_order = 1 where id = 90001");
        jdbc.update("update product_component set display_order = 0 where id = 91001");
        match(91001, 90002, 0.6);
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.partId").value(91001))
            .andExpect(jsonPath("$.items[*].id", contains(90002)));
        jdbc.update("insert into product_similarity_calculation values (90002)");
        mockMvc.perform(get("/api/products/90002/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.calculated").value(true))
            .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("대상 구성품 동점은 ID 순으로 고르고 활성 옵션이 하나라도 있으면 노출한다")
    void breaksPartTiesAndAcceptsOneActiveVariant() throws Exception {
        match(90001, 90002, 0.6);
        match(90001, 91002, 0.6);
        jdbc.update("""
            insert into product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
            values (91002, 90002, 1, 1000, 100, 'ml', 'discontinued')
            """);
        mockMvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(90002)))
            .andExpect(jsonPath("$.items[0].partId").value(90002));
    }
}
