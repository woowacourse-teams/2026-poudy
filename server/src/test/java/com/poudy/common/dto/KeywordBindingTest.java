package com.poudy.common.dto;

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
@DisplayName("검색어를 받는 조회")
class KeywordBindingTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/api/ingredients", "/api/products/suggestions"})
    @DisplayName("검색어가 없으면 400 을 반환한다")
    void rejectsMissingKeyword(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/ingredients", "/api/products/suggestions"})
    @DisplayName("검색어가 비어 있으면 400 을 반환한다")
    void rejectsBlankKeyword(String path) throws Exception {
        mockMvc.perform(get(path).param("keyword", "   ")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/ingredients", "/api/products/suggestions"})
    @DisplayName("공백으로만 이뤄진 검색어는 종류를 가리지 않고 400 을 반환한다")
    void rejectsKeywordMadeOfSpaces(String path) throws Exception {
        mockMvc.perform(get(path).param("keyword", "\u00A0\u2007")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/ingredients", "/api/products/suggestions"})
    @DisplayName("검색어가 있으면 200 을 반환한다")
    void acceptsKeyword(String path) throws Exception {
        mockMvc.perform(get(path).param("keyword", "글리")).andExpect(status().isOk());
    }
}
