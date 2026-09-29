package com.poudy.product.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("제품 조회 성분군 조건")
class ProductIngredientGroupFilterTest {

    private static final String GROUP = "TEST_GROUP";
    private static final String MEMBERS_IN_PRODUCT = """
        select count(distinct pc.product_id) from product_component pc
        join product_ingredient pi on pi.component_id = pc.id
        where pi.ingredient_id in (3551, 1005)
        """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void addGroup() {
        jdbc.update(
            "insert into ingredient_group (code, display_name, description) values (?, ?, ?)",
            GROUP,
            "테스트 성분군",
            "테스트용 성분군입니다."
        );
        jdbc.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order) values (?, 3551, 0), (?, 1005, 1)",
            GROUP,
            GROUP
        );
    }

    @Test
    @DisplayName("포함 성분군은 속한 성분을 하나라도 가진 제품만 남긴다")
    void includesProductsWithAnyMember() throws Exception {
        Long expected = jdbc.queryForObject(MEMBERS_IN_PRODUCT, Long.class);

        mockMvc.perform(get("/api/products/count").param("includeGroupCodes", GROUP))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(expected));
    }

    @Test
    @DisplayName("제외 성분군은 속한 성분을 하나라도 가진 제품을 뺀다")
    void excludesProductsWithAnyMember() throws Exception {
        Long total = jdbc.queryForObject("select count(*) from product", Long.class);
        Long withMembers = jdbc.queryForObject(MEMBERS_IN_PRODUCT, Long.class);

        mockMvc.perform(get("/api/products/count").param("excludeGroupCodes", GROUP))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(total - withMembers));
    }

    @Test
    @DisplayName("제외 성분군에 속한 성분을 포함 조건으로 고르면 400 을 반환한다")
    void rejectsIngredientCoveredByExcludedGroup() throws Exception {
        mockMvc.perform(get("/api/products").param("includeIngredientIds", "3551").param("excludeGroupCodes", GROUP))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    @DisplayName("같은 성분군을 포함과 제외에 함께 넣으면 400 을 반환한다")
    void rejectsSameGroupIncludedAndExcluded() throws Exception {
        mockMvc.perform(get("/api/products").param("includeGroupCodes", GROUP).param("excludeGroupCodes", GROUP))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    @DisplayName("없는 성분군이나 제외 성분군 코드는 잘못된 조건으로 거절한다")
    void rejectsUnknownOrExcludeCodeGroup() throws Exception {
        mockMvc.perform(get("/api/products").param("includeGroupCodes", "UNKNOWN"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
        mockMvc.perform(get("/api/products").param("excludeGroupCodes", "HARSH_PRESERVATIVES"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }
}
