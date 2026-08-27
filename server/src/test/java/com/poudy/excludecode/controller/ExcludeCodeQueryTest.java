package com.poudy.excludecode.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.excludecode.domain.ExcludeCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제외 성분군 조회")
class ExcludeCodeQueryTest {

    private static final int CODE_COUNT = ExcludeCode.values().length;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("성분군 전체를 선언 순서대로 반환한다")
    void findsEveryExcludeCodeInDeclaredOrder() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(CODE_COUNT))
            .andExpect(jsonPath("$.items[0].code").value(ExcludeCode.FRAGRANCE_ALLERGENS.name()))
            .andExpect(jsonPath("$.items[1].code").value(ExcludeCode.DRYING_ALCOHOLS.name()))
            .andExpect(jsonPath("$.items[2].code").value(ExcludeCode.HARSH_PRESERVATIVES.name()))
            .andExpect(jsonPath("$.items[3].code").value(ExcludeCode.SULFATES.name()))
            .andExpect(jsonPath("$.items[4].code").value(ExcludeCode.CYCLIC_SILICONES.name()))
            .andExpect(jsonPath("$.items[5].code").value(ExcludeCode.SYNTHETIC_COLORANTS.name()));
    }

    @Test
    @DisplayName("성분군마다 표시 이름과 설명을 채워 반환한다")
    void findsDisplayNameAndDescription() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[2].name").value(ExcludeCode.HARSH_PRESERVATIVES.displayName()))
            .andExpect(jsonPath("$.items[2].description").value(ExcludeCode.HARSH_PRESERVATIVES.description()))
            .andExpect(jsonPath("$.items[*].name", everyItem(not(blankOrNullString()))))
            .andExpect(jsonPath("$.items[*].description", everyItem(not(blankOrNullString()))));
    }

    @Test
    @DisplayName("성분군에 속한 성분을 데이터 순서대로 실제 성분 데이터로 채운다")
    void findsResolvedIngredients() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[2].ingredients.length()").value(10))
            .andExpect(jsonPath("$.items[2].ingredients[0].id").value(213))
            .andExpect(jsonPath("$.items[2].ingredients[0].koreanName").value("메틸파라벤"))
            .andExpect(jsonPath("$.items[2].ingredients[7].id").value(3551))
            .andExpect(jsonPath("$.items[2].ingredients[7].koreanName").value("페녹시에탄올"))
            .andExpect(jsonPath("$.items[2].ingredients[7].englishName").value("Phenoxyethanol"))
            .andExpect(jsonPath("$.items[2].ingredients[9].koreanName").value("디엠디엠하이단토인"))
            .andExpect(jsonPath("$.items[0].ingredients[0].koreanName").value("리날룰"))
            .andExpect(jsonPath("$.items[3].ingredients[0].koreanName").value("소듐라우레스설페이트"))
            .andExpect(jsonPath("$.items[4].ingredients[3].koreanName").value("사이클로헥사실록세인"))
            .andExpect(jsonPath("$.items[5].ingredients.length()").value(84));
    }

    @Test
    @DisplayName("성분이 비어 있는 성분군은 없다")
    void findsNoEmptyExcludeCode() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].ingredients[0].id", hasSize(CODE_COUNT)));
    }
}
