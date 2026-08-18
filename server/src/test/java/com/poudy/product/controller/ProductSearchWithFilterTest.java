package com.poudy.product.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("검색어와 필터를 함께 받는 제품 조회")
class ProductSearchWithFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("검색어와 필터 조건을 함께 보내도 조회된다")
    void acceptsKeywordWithFilter(String path) throws Exception {
        mockMvc.perform(
                get(path).param("keyword", "토너").param("categoryIds", "1").param("brandIds", "12")
                        .param("includeIngredientIds", "1005").param("excludeCodes", "HARSH_PRESERVATIVES"))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("검색어만 보내도 조회된다")
    void acceptsKeywordAlone(String path) throws Exception {
        mockMvc.perform(get(path).param("keyword", "토너")).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("조건이 없어도 조회된다")
    void acceptsRequestWithoutCondition(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("검색어가 비어 있으면 400 을 반환한다")
    void rejectsBlankKeyword(String path) throws Exception {
        mockMvc.perform(get(path).param("keyword", "   ")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/products/count"})
    @DisplayName("검색어와 함께 와도 성분 필터 모순은 그대로 거절한다")
    void stillRejectsConflictingIngredientFilter(String path) throws Exception {
        mockMvc.perform(
                get(path).param("keyword", "토너").param("includeIngredientIds", "3551")
                        .param("excludeCodes", "HARSH_PRESERVATIVES"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("filterLists")
    @DisplayName("필터 목록에 빈 요소가 섞이면 400 을 반환한다")
    void rejectsNullFilterElement(String path, String parameter, String validValue) throws Exception {
        mockMvc.perform(get(path).param(parameter, validValue, ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    private static Stream<Arguments> filterLists() {
        return Stream.of("/api/products", "/api/products/count")
                .flatMap(
                        path -> Stream.of(
                                Arguments.of(path, "categoryIds", "2"),
                                Arguments.of(path, "brandIds", "1"),
                                Arguments.of(path, "moistureLevel", "1"),
                                Arguments.of(path, "oilLevel", "1"),
                                Arguments.of(path, "includeIngredientIds", "20"),
                                Arguments.of(path, "excludeIngredientIds", "20"),
                                Arguments.of(path, "excludeCodes", "SULFATES")));
    }
}
