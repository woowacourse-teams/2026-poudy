package com.poudy.product.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품 조회 필터 충돌")
class ProductFilterConflictTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("포함 성분이 제외 성분군에 속하면 400 을 반환한다")
    void rejectsIngredientCoveredByExcludedCode(String path) throws Exception {
        mockMvc.perform(get(path).param("includeIngredientIds", "2301").param("excludeCodes", "HARSH_PRESERVATIVES"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("같은 모순을 성분 ID 로 표현해도 같은 코드로 거절한다")
    void rejectsSameConflictExpressedWithIngredientIds(String path) throws Exception {
        mockMvc.perform(get(path).param("includeIngredientIds", "2301").param("excludeIngredientIds", "2301"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("겹치지 않으면 조회된다")
    void acceptsDisjointFilter(String path) throws Exception {
        mockMvc.perform(get(path).param("includeIngredientIds", "1005").param("excludeCodes", "HARSH_PRESERVATIVES"))
                .andExpect(status().isOk());
    }
}
