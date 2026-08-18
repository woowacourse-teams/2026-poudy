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
@DisplayName("성분 일괄 조회")
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
                .andExpect(jsonPath("$.items[1].skinEffects[0].id").value(104));
    }

    @Test
    @DisplayName("성분 ID 파라미터가 없으면 잘못된 요청으로 응답한다")
    void rejectsMissingIngredientIds() throws Exception {
        mockMvc.perform(get("/api/ingredients"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("검색어와 성분 ID를 함께 보내면 잘못된 요청으로 응답한다")
    void rejectsKeywordWithIngredientIds() throws Exception {
        mockMvc.perform(get("/api/ingredients").param("keyword", "리날룰").param("ingredientIds", "9"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }
}
