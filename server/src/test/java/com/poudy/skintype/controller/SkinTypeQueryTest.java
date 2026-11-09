package com.poudy.skintype.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("피부타입 조회")
class SkinTypeQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("요청 파라미터 없이 세 가지 피부타입 코드와 표시명을 정해진 순서로 반환한다")
    void findsSkinTypesInDisplayOrder() throws Exception {
        mockMvc.perform(get("/api/skin-types"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(3)))
            .andExpect(jsonPath("$.items[*].code", contains("DRY", "OILY", "COMBINATION")))
            .andExpect(jsonPath("$.items[*].name", contains("건성", "지성", "복합성")));
    }

    @Test
    @DisplayName("전체 피부 선택지는 민감성을 별도로 항상 제공하고 제품 수는 포함하지 않는다")
    void findsSkinOptionsWithSeparateSensitivity() throws Exception {
        mockMvc.perform(get("/api/skin-options"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skinTypes[*].code", contains("DRY", "OILY", "COMBINATION")))
            .andExpect(jsonPath("$.skinTypes[*].name", contains("건성", "지성", "복합성")))
            .andExpect(jsonPath("$.sensitiveSkin.name").value("민감성"))
            .andExpect(jsonPath("$.sensitiveSkin.code").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.sensitiveSkin.productCount").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.skinTypes[0].productCount").doesNotHaveJsonPath());
    }
}
