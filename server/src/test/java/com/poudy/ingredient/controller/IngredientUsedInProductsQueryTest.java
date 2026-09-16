package com.poudy.ingredient.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품에 쓰인 성분 조회")
class IngredientUsedInProductsQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("제품 전성분에 쓰인 성분만 반환하고 전체 개수도 그 기준으로 싣는다")
    void findsIngredientsUsedInProducts() throws Exception {
        mockMvc.perform(get("/api/ingredients").param("usedInProducts", "true").param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", containsInAnyOrder(9, 20, 4815)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(false));
    }

    @Test
    @DisplayName("성분 ID 조건과 함께 보내면 요청한 순서를 유지한 채 제품에 쓰인 성분만 남긴다")
    void combinesWithIngredientIds() throws Exception {
        mockMvc.perform(
            get("/api/ingredients")
                .param("ingredientIds", "4815,1,9")
                .param("usedInProducts", "true")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(4815L))
            .andExpect(jsonPath("$.items[1].id").value(9L))
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
    }

    @Test
    @DisplayName("false 로 보내면 조건이 없을 때와 같은 전체 성분을 조회한다")
    void findsAllIngredientsWhenFalse() throws Exception {
        String unfiltered = mockMvc.perform(get("/api/ingredients"))
            .andReturn()
            .getResponse()
            .getContentAsString();
        Integer allIngredientCount = JsonPath.read(unfiltered, "$.pagination.totalElements");

        mockMvc.perform(get("/api/ingredients").param("usedInProducts", "false"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(allIngredientCount));
    }

    @Test
    @DisplayName("참거짓이 아닌 값을 보내면 잘못된 요청으로 응답한다")
    void rejectsNonBooleanValue() throws Exception {
        mockMvc.perform(get("/api/ingredients").param("usedInProducts", "maybe"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }
}
