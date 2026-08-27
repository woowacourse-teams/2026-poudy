package com.poudy.ingredient.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("성분 ID 목록 조회")
class IngredientByIdsQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("요청한 순서대로 존재하는 실제 성분만 반환한다")
    void findsIngredientsByIds() throws Exception {
        mockMvc.perform(get("/api/ingredients").param("ingredientIds", "9,999999,2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(9L))
            .andExpect(jsonPath("$.items[0].koreanName").value("리날룰"))
            .andExpect(jsonPath("$.items[0].englishName").value("Linalool"))
            .andExpect(jsonPath("$.items[1].id").value(2L))
            .andExpect(jsonPath("$.items[1].koreanName").value("가지열매추출물"))
            .andExpect(jsonPath("$.items[1].skinEffects[0].id").value(47));
    }

    @Test
    @DisplayName("선택한 성분을 페이지 단위로 반환하고 존재하는 성분의 전체 개수를 함께 싣는다")
    void findsSelectedIngredientPage() throws Exception {
        mockMvc.perform(
            get("/api/ingredients")
                .param("ingredientIds", "1,2,9,999999")
                .param("page", "0")
                .param("size", "2")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(1L))
            .andExpect(jsonPath("$.items[1].id").value(2L))
            .andExpect(jsonPath("$.pagination.page").value(0))
            .andExpect(jsonPath("$.pagination.size").value(2))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.totalPages").value(2))
            .andExpect(jsonPath("$.pagination.hasNext").value(true));
    }

    @Test
    @DisplayName("성분 ID 파라미터가 없으면 전체 성분의 첫 페이지를 반환한다")
    void findsAllIngredientsWithoutIngredientIds() throws Exception {
        mockMvc.perform(get("/api/ingredients"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(20))
            .andExpect(jsonPath("$.pagination.page").value(0))
            .andExpect(jsonPath("$.pagination.size").value(20))
            .andExpect(jsonPath("$.pagination.totalElements").isNumber())
            .andExpect(jsonPath("$.pagination.hasNext").value(true));
    }

    @Test
    @DisplayName("다음 페이지에서도 선택한 성분의 요청 순서를 유지한다")
    void keepsRequestedOrderAcrossPages() throws Exception {
        mockMvc.perform(
            get("/api/ingredients")
                .param("ingredientIds", "9,2,1")
                .param("page", "1")
                .param("size", "2")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(1L))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(false));
    }

    @Test
    @DisplayName("성분 ID 목록에 빈 요소가 섞이면 잘못된 요청으로 응답한다")
    void rejectsNullIngredientId() throws Exception {
        mockMvc.perform(get("/api/ingredients").param("ingredientIds", "9", ""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }
}
