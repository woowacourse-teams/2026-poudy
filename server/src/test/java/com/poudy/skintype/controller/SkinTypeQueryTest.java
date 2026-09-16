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
    @DisplayName("요청 파라미터 없이 네 가지 피부타입 코드와 표시명을 정해진 순서로 반환한다")
    void findsSkinTypesInDisplayOrder() throws Exception {
        mockMvc.perform(get("/api/skin-types"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(4)))
            .andExpect(jsonPath("$.items[*].code", contains("DRY", "OILY", "SENSITIVE", "COMBINATION")))
            .andExpect(jsonPath("$.items[*].name", contains("건성", "지성", "민감성", "복합성")));
    }
}
