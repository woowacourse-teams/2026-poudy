package com.poudy.ingredient.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import com.poudy.excludecode.domain.ExcludeCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("성분 상세 조회")
class IngredientDetailTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("성분 정보와 배합 목적, 제외 성분군, 제품 수, 출처를 조회한다")
    void findsIngredientDetail() throws Exception {
        mockMvc.perform(get("/api/ingredients/9")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.koreanName").value("리날룰")).andExpect(jsonPath("$.englishName").value("Linalool"))
                .andExpect(jsonPath("$.formulationRoles[0].id").value(22))
                .andExpect(jsonPath("$.formulationRoles[0].name").value("향료"))
                .andExpect(jsonPath("$.skinEffects").isEmpty())
                .andExpect(jsonPath("$.groupCodes[0]").value(ExcludeCode.FRAGRANCE_ALLERGENS.name()))
                .andExpect(jsonPath("$.productCount").value(1))
                .andExpect(jsonPath("$.infoSources[0]").value("대한화장품협회 성분사전 「리날룰」(성분코드 9)"))
                .andExpect(jsonPath("$.effectSources.length()").value(3))
                .andExpect(jsonPath("$.updatedAt").value("2026-08-13T08:50:49.068Z"));
    }

    @Test
    @DisplayName("피부 작용 태그와 제품이 없는 경우를 실제 데이터대로 조회한다")
    void findsSkinEffectsAndEmptyRelations() throws Exception {
        mockMvc.perform(get("/api/ingredients/2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.formulationRoles").isEmpty())
                .andExpect(jsonPath("$.skinEffects[0].id").value(104))
                .andExpect(jsonPath("$.skinEffects[0].name").value("항산화 관련"))
                .andExpect(jsonPath("$.groupCodes").isEmpty()).andExpect(jsonPath("$.productCount").value(0));
    }

    @Test
    @DisplayName("존재하지 않는 성분이면 404를 반환한다")
    void rejectsUnknownIngredient() throws Exception {
        mockMvc.perform(get("/api/ingredients/999999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.INGREDIENT_NOT_FOUND.name()));
    }
}
