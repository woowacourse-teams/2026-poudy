package com.poudy.ingredient.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.ingredient.domain.Ingredients;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("성분 검색")
class IngredientSearchTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"가지", "가지추출물", "eGgPlAnT"})
    @DisplayName("한글명, 별칭과 대소문자가 다른 영문명으로 실제 성분을 찾는다")
    void searchesActualIngredients(String keyword) throws Exception {
        mockMvc.perform(get("/api/ingredients/suggestions").param("keyword", keyword)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(2))
                .andExpect(jsonPath("$.items[0].koreanName").value("가지열매추출물"))
                .andExpect(jsonPath("$.items[0].englishName").value("Solanum Melongena (Eggplant) Fruit Extract"))
                .andExpect(jsonPath("$.items[0].skinEffects[0].id").value(47))
                .andExpect(jsonPath("$.items[0].skinEffects[0].name").value("항산화 관련"));
    }

    @Test
    @DisplayName("걸린 성분이 많아도 검색어에 잘 맞는 순서로 최대 5 건만 반환한다")
    void limitsSearchResult() throws Exception {
        mockMvc.perform(get("/api/ingredients/suggestions").param("keyword", "적색"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(Ingredients.SEARCH_RESULT_LIMIT))
                .andExpect(jsonPath("$.items[0].id").value(2645))
                .andExpect(jsonPath("$.items[0].koreanName").value("적색2호"));
    }

    @Test
    @DisplayName("상한 안에서도 이름이 검색어와 같은 성분을 먼저 반환한다")
    void keepsExactMatchWithinLimit() throws Exception {
        mockMvc.perform(get("/api/ingredients/suggestions").param("keyword", "적색201호"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(2653))
                .andExpect(jsonPath("$.items[0].koreanName").value("적색201호"));
    }
}
